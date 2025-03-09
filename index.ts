#!/usr/bin/env node

// Polyfill fetch for Node.js versions < 18
import fetch from "node-fetch";
if (!globalThis.fetch) {
  globalThis.fetch = fetch as unknown as typeof globalThis.fetch;
}

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
  InitializeRequestSchema
} from "@modelcontextprotocol/sdk/types.js";

import {
  handleProviderLookup,
  handleResourceUsage,
  handleModuleRecommendations,
  handleDataSourceLookup,
  handleResourceArgumentDetails,
  handleModuleDetails,
  handleFunctionDetails,
  handleProviderGuides,
  handlePolicySearch,
  handlePolicyDetails,
  handleListOrganizations,
  handlePrivateModuleSearch,
  handlePrivateModuleDetails
} from "./handlers/index.js";

import { 
  VERSION, 
  SERVER_NAME,
  TFC_TOKEN
} from "./config.js";

import logger from "./utils/logger.js";
import { 
  ProviderLookupInput,
  ResourceUsageInput,
  ModuleRecommendationsInput,
  DataSourceLookupInput,
  ModuleDetailsInput,
  ResourceDocumentationInput,
  FunctionDetailsInput,
  ProviderGuidesInput,
  PolicySearchInput,
  PolicyDetailsInput,
  PrivateModuleSearchParams,
  PrivateModuleDetailsParams
} from "./types/index.js";

// Add a type definition for handleRequest which isn't directly exposed in types
declare module "@modelcontextprotocol/sdk/server/index.js" {
  interface Server {
    handleRequest(schema: any, request: any): Promise<any>;
  }
}

// Define the base tools available in the server
const baseTools: Tool[] = [
  {
    name: "providerLookup",
    description: "Lookup a Terraform provider by name and optionally version.",
    inputSchema: { 
      type: "object", 
      properties: {
        provider: { type: "string", description: "Provider name (e.g. 'aws')" },
        namespace: { type: "string", description: "Provider namespace (e.g. 'hashicorp')" },
        version: { type: "string", description: "Provider version (defaults to latest)" }
      }
    },
    handler: handleProviderLookup
  },
  {
    name: "resourceUsage",
    description: "Get an example usage of a Terraform resource and related resources.",
    inputSchema: { 
      type: "object", 
      properties: {
        provider: { type: "string", description: "Provider name (e.g. 'aws')" },
        resource: { type: "string", description: "Resource name (e.g. 'aws_instance')" },
        name: { type: "string", description: "Alternative resource name field (fallback if resource not specified)" }
      }
    },
    handler: handleResourceUsage
  },
  {
    name: "moduleRecommendations",
    description: "Search for and recommend Terraform modules for a given query.",
    inputSchema: { 
      type: "object", 
      properties: {
        query: { type: "string", description: "Search query (e.g. 'vpc')" },
        keyword: { type: "string", description: "Alternative search keyword (fallback if query not specified)" },
        provider: { type: "string", description: "Filter modules by provider (e.g. 'aws')" }
      }
    },
    handler: handleModuleRecommendations
  },
  {
    name: "dataSourceLookup",
    description: "List all available data sources for a provider and their basic details.",
    inputSchema: { 
      type: "object", 
      properties: {
        provider: { type: "string", description: "Provider name (e.g. 'aws')" },
        namespace: { type: "string", description: "Provider namespace (e.g. 'hashicorp')" }
      },
      required: ["provider", "namespace"]
    },
    handler: handleDataSourceLookup
  },
  {
    name: "resourceArgumentDetails",
    description: "Fetches comprehensive details about a specific resource type's arguments, including required and optional attributes, nested blocks, and their descriptions.",
    inputSchema: { 
      type: "object", 
      properties: {
        provider: { type: "string", description: "Provider name (e.g. 'aws')" },
        namespace: { type: "string", description: "Provider namespace (e.g. 'hashicorp')" },
        resource: { type: "string", description: "Resource name (e.g. 'aws_instance')" },
        version: { type: "string", description: "Provider version (defaults to latest)" }
      },
      required: ["provider", "namespace", "resource"]
    },
    handler: handleResourceArgumentDetails
  },
  {
    name: "moduleDetails",
    description: "Retrieves detailed metadata for a Terraform module including versions, inputs, outputs, and dependencies.",
    inputSchema: { 
      type: "object", 
      properties: {
        namespace: { type: "string", description: "Module namespace (e.g. 'terraform-aws-modules')" },
        module: { type: "string", description: "Module name (e.g. 'vpc')" },
        provider: { type: "string", description: "Provider name (e.g. 'aws')" }
      },
      required: ["namespace", "module", "provider"]
    },
    handler: handleModuleDetails
  },
  {
    name: "functionDetails",
    description: "Get details about a Terraform provider function.",
    inputSchema: {
      type: "object",
      required: ["provider", "function"],
      properties: {
        provider: { type: "string", description: "Provider name (e.g. 'aws')" },
        namespace: { type: "string", description: "Provider namespace (e.g. 'hashicorp')" },
        function: { type: "string", description: "Function name (e.g. 'arn_parse')" }
      }
    },
    handler: handleFunctionDetails
  },
  {
    name: "providerGuides",
    description: "List and view provider-specific guides, including version upgrades and feature guides.",
    inputSchema: {
      type: "object",
      required: ["provider"],
      properties: {
        provider: { type: "string", description: "Provider name (e.g. 'aws')" },
        namespace: { type: "string", description: "Provider namespace (e.g. 'hashicorp')" },
        guide: { type: "string", description: "Specific guide to fetch (by slug or title)" },
        search: { type: "string", description: "Search term to filter guides" }
      }
    },
    handler: handleProviderGuides
  },
  {
    name: "policySearch",
    description: "Search for policy libraries in the Terraform Registry.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query for finding policy libraries" },
        provider: { type: "string", description: "Filter policies by provider (e.g. 'aws')" }
      }
    },
    handler: handlePolicySearch
  },
  {
    name: "policyDetails",
    description: "Get detailed information about a specific policy library including its latest version.",
    inputSchema: {
      type: "object",
      required: ["namespace", "name"],
      properties: {
        namespace: { type: "string", description: "Policy library namespace (e.g. 'Great-Stone')" },
        name: { type: "string", description: "Policy library name (e.g. 'vault-aws-secret-type')" }
      }
    },
    handler: handlePolicyDetails
  }
];

// Define the TFC-specific tools that require authentication
const tfcTools: Tool[] = [
  {
    name: "listOrganizations",
    description: "List all organizations the authenticated user has access to in Terraform Cloud.",
    inputSchema: { 
      type: "object",
      properties: {}
    },
    handler: handleListOrganizations
  },
  {
    name: "privateModuleSearch",
    description: "Search for private modules in a Terraform Cloud organization.",
    inputSchema: { 
      type: "object",
      required: ["organization"],
      properties: {
        organization: { type: "string", description: "The organization name to search in" },
        query: { type: "string", description: "Search term" },
        provider: { type: "string", description: "Filter by provider" },
        page: { type: "number", description: "Page number (default: 1)" },
        per_page: { type: "number", description: "Results per page (default: 20)" }
      }
    },
    handler: handlePrivateModuleSearch
  },
  {
    name: "privateModuleDetails",
    description: "Get detailed information about a private module including inputs, outputs, and no-code configuration.",
    inputSchema: { 
      type: "object",
      required: ["organization", "namespace", "name", "provider"],
      properties: {
        organization: { type: "string", description: "The organization name" },
        namespace: { type: "string", description: "The module namespace, likely same as organization name" },
        name: { type: "string", description: "The module name" },
        provider: { type: "string", description: "The provider name" },
        version: { type: "string", description: "Optional specific version to fetch" }
      }
    },
    handler: handlePrivateModuleDetails
  }
];

// Combine tools based on TFC_TOKEN availability
const tools: Tool[] = TFC_TOKEN 
  ? [...baseTools, ...tfcTools]
  : baseTools;

// Initialize the server
const server = new Server(
  {
    name: SERVER_NAME,
    version: VERSION
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// Log initialization
logger.info("Server constructor created, setting up handlers...");

// Initialize handler
server.setRequestHandler(InitializeRequestSchema, async (request) => {
  logger.info("Received Initialize request!");
  logger.debug("Initialize request details:", request);
  
  return {
    protocolVersion: request.params.protocolVersion,
    capabilities: { tools: {} },
    serverInfo: { 
      name: SERVER_NAME, 
      version: VERSION 
    }
  };
});

// ListToolsRequest handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  logger.info("Received ListToolsRequest");
  return { tools };
});

// Validate and convert arguments
function validateArgs<T>(args: Record<string, unknown> | undefined, requiredFields: string[]): T | undefined {
  if (!args) return undefined;
  
  for (const field of requiredFields) {
    if (!(field in args)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  
  return args as T;
}

// Handle tool requests
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name: toolName, arguments: args } = request.params;

  if (!toolName) {
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          status: "error",
          error: "Tool name is required"
        })
      }]
    };
  }

  try {
    let response;

    switch (toolName) {
    case "resourceArgumentDetails": {
      const validArgs = validateArgs<ResourceDocumentationInput>(args, ["namespace", "provider", "resource"]);
      if (!validArgs) throw new Error("Missing required arguments");
      response = await handleResourceArgumentDetails(validArgs);
      break;
    }
    case "resourceUsage": {
      const validArgs = validateArgs<ResourceUsageInput>(args, ["provider", "resource"]);
      if (!validArgs) throw new Error("Missing required arguments");
      response = await handleResourceUsage(validArgs);
      break;
    }
    case "providerLookup": {
      const validArgs = validateArgs<ProviderLookupInput>(args, ["provider"]);
      if (!validArgs) throw new Error("Missing required arguments");
      response = await handleProviderLookup(validArgs);
      break;
    }
    case "moduleRecommendations": {
      const validArgs = validateArgs<ModuleRecommendationsInput>(args, ["query"]);
      if (!validArgs) throw new Error("Missing required arguments");
      response = await handleModuleRecommendations(validArgs);
      break;
    }
    case "dataSourceLookup": {
      const validArgs = validateArgs<DataSourceLookupInput>(args, ["provider", "namespace"]);
      if (!validArgs) throw new Error("Missing required arguments");
      response = await handleDataSourceLookup(validArgs);
      break;
    }
    case "moduleDetails": {
      const validArgs = validateArgs<ModuleDetailsInput>(args, ["namespace", "module", "provider"]);
      if (!validArgs) throw new Error("Missing required arguments");
      response = await handleModuleDetails(validArgs);
      break;
    }
    case "functionDetails": {
      const validArgs = validateArgs<FunctionDetailsInput>(args, ["provider", "function"]);
      if (!validArgs) throw new Error("Missing required arguments");
      response = await handleFunctionDetails(validArgs);
      break;
    }
    case "providerGuides": {
      const validArgs = validateArgs<ProviderGuidesInput>(args, ["provider"]);
      if (!validArgs) throw new Error("Missing required arguments");
      response = await handleProviderGuides(validArgs);
      break;
    }
    case "policySearch": {
      const validArgs = validateArgs<PolicySearchInput>(args, ["query"]);
      if (!validArgs) throw new Error("Missing required arguments");
      response = await handlePolicySearch(validArgs);
      break;
    }
    case "policyDetails": {
      const validArgs = validateArgs<PolicyDetailsInput>(args, ["namespace", "name"]);
      if (!validArgs) throw new Error("Missing required arguments");
      response = await handlePolicyDetails(validArgs);
      break;
    }
    case "listOrganizations": {
      response = await handleListOrganizations();
      break;
    }
    case "privateModuleSearch": {
      const validArgs = validateArgs<PrivateModuleSearchParams>(args, ["organization"]);
      if (!validArgs) throw new Error("Missing required arguments");
      response = await handlePrivateModuleSearch(validArgs);
      break;
    }
    case "privateModuleDetails": {
      const validArgs = validateArgs<PrivateModuleDetailsParams>(args, ["organization", "namespace", "name", "provider"]);
      if (!validArgs) throw new Error("Missing required arguments");
      response = await handlePrivateModuleDetails(validArgs);
      break;
    }
    default:
      throw new Error(`Unknown tool: ${toolName}`);
    }

    return response;
  } catch (error) {
    logger.error("Error handling tool request:", error);
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          status: "error",
          error: error instanceof Error ? error.message : String(error)
        })
      }]
    };
  }
});

// Start the server
async function main() {
  console.error("🚀 Starting terraform-registry MCP server...");
  const transport = new StdioServerTransport();

  // Prevent unhandled promise rejections from crashing the server
  process.on("unhandledRejection", (reason) => {
    console.error("💥 Unhandled Promise Rejection:", reason);
  });

  try {
    await server.connect(transport);
    console.error("✅ Server connected and ready for requests");
    
    console.error("📝 Server running on stdio transport");
  } catch (error) {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("💀 Fatal error:", error);
  process.exit(1);
});