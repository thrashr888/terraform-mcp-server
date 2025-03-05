#!/usr/bin/env node

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
  handleModuleDetails
} from "./handlers/index.js";

import { 
  VERSION, 
  SERVER_NAME, 
  REGISTRY_API_BASE, 
  DEFAULT_NAMESPACE,
  LOG_LEVEL,
  REQUEST_TIMEOUT_MS
} from "./config.js";
import logger from "./utils/logger.js";
import { 
  ProviderLookupInput,
  ResourceUsageInput,
  ModuleRecommendationsInput,
  DataSourceLookupInput,
  ResourceArgumentDetailsInput,
  ModuleDetailsInput
} from "./types/index.js";

// Add a type definition for handleRequest which isn't directly exposed in types
declare module "@modelcontextprotocol/sdk/server/index.js" {
  interface Server {
    handleRequest(schema: any, request: any): Promise<any>;
  }
}

// Define the tools available in the server
const tools: Tool[] = [
  {
    name: "providerLookup",
    description: "Lookup a Terraform provider by name and optionally version.",
    inputSchema: { 
      type: "object", 
      properties: {
        provider: { type: "string", description: "Provider name (e.g. 'aws')" },
        namespace: { type: "string", description: "Provider namespace (e.g. 'hashicorp')" },
        version: { type: "string", description: "Provider version (e.g. '4.0.0')" }
      },
      required: ["provider"]
    }
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
    }
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
    }
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
    }
  },
  {
    name: "resourceArgumentDetails",
    description: "Fetches details about a specific resource type's arguments, including name, type, description, and requirements.",
    inputSchema: { 
      type: "object", 
      properties: {
        provider: { type: "string", description: "Provider name (e.g. 'aws')" },
        namespace: { type: "string", description: "Provider namespace (e.g. 'hashicorp')" },
        resource: { type: "string", description: "Resource name (e.g. 'aws_instance')" }
      },
      required: ["provider", "namespace", "resource"]
    }
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
    }
  },
];

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

// CallToolRequest handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  logger.debug("Handling tool call request:", request);
  
  // Extract tool name and arguments
  const toolName = request.params.name;
  const arguments_ = request.params.arguments || {};
  
  if (!toolName) {
    logger.error("Tool name is missing in the request");
    return { content: [{ type: "text", text: "Error: Tool name is missing in the request" }] };
  }
  
  try {
    logger.info(`Processing tool request for: "${toolName}"`);
    
    // Route to the appropriate handler based on the tool name
    switch (toolName) {
    case "providerLookup": {
      const args = arguments_ as unknown as ProviderLookupInput;
      return await handleProviderLookup(args);
    }
    case "resourceUsage": {
      const args = arguments_ as unknown as ResourceUsageInput;
      return await handleResourceUsage(args);
    }
    case "moduleRecommendations": {
      const args = arguments_ as unknown as ModuleRecommendationsInput;
      return await handleModuleRecommendations(args);
    }
    case "dataSourceLookup": {
      const args = arguments_ as unknown as DataSourceLookupInput;
      return await handleDataSourceLookup(args);
    }
    case "resourceArgumentDetails": {
      const args = arguments_ as unknown as ResourceArgumentDetailsInput;
      return await handleResourceArgumentDetails(args);
    }
    case "moduleDetails": {
      const args = arguments_ as unknown as ModuleDetailsInput;
      return await handleModuleDetails(args);
    }
    default:
      throw new Error(`Unknown tool: ${toolName}`);
    }
  } catch (error) {
    logger.error(`Error in tool handler for ${toolName}:`, error);
    throw error;
  }
});

/**
 * Logs the current configuration values for debugging
 */
function logConfiguration() {
  const config = {
    registryApiBase: REGISTRY_API_BASE,
    defaultNamespace: DEFAULT_NAMESPACE,
    logLevel: LOG_LEVEL,
    requestTimeoutMs: REQUEST_TIMEOUT_MS
  };
  logger.info(`Configuration loaded for ${SERVER_NAME} v${VERSION}`, config);
}

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
    
    logConfiguration();
    
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