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
  InitializeRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListResourceTemplatesRequestSchema,
  SubscribeRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

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
  handlePrivateModuleDetails,
  handleExplorerQuery,
  handleListWorkspaces,
  handleShowWorkspace,
  handleLockWorkspace,
  handleUnlockWorkspace,
  handleListRuns,
  handleShowRun,
  handleCreateRun,
  handleApplyRun,
  handleCancelRun,
  handleListWorkspaceResources
} from "./src/tools/index.js";

import { VERSION, SERVER_NAME, TFC_TOKEN } from "./config.js";

import logger from "./src/utils/logger.js";
// Reverted: Import Zod schemas for tool inputs (using original types)
import {
  ProviderLookupInput,
  ResourceUsageInput,
  ModuleRecommendationsInput,
  DataSourceLookupInput,
  ResourceDocumentationInput,
  ModuleDetailsInput,
  FunctionDetailsInput,
  ProviderGuidesInput,
  PolicySearchInput,
  PolicyDetailsInput,
  PrivateModuleSearchParams,
  PrivateModuleDetailsParams
} from "./src/types/index.js";

import { ExplorerQueryParams } from "./src/tools/explorer.js";
import { WorkspacesQueryParams, WorkspaceActionParams } from "./src/tools/workspaces.js";
import { RunsQueryParams, RunCreateParams, RunActionParams } from "./src/tools/runs.js";
import { WorkspaceResourcesQueryParams } from "./src/tools/workspaceResources.js";

import {
  handleResourcesList,
  handleResourcesRead,
  handleResourcesTemplatesList,
  handleResourcesSubscribe
} from "./src/resources/index.js";

// Infer request types from SDK schemas
type ListResourcesRequest = z.infer<typeof ListResourcesRequestSchema>;
type ReadResourceRequest = z.infer<typeof ReadResourceRequestSchema>;

// Reverted: Define the base tools available in the server (original structure)
const baseTools: Tool[] = [
  {
    name: "providerDetails",
    description: "Get detailed information about a Terraform provider by name and optionally version.",
    inputSchema: {
      type: "object",
      properties: {
        provider: { type: "string", description: "Provider name (e.g. 'aws')" },
        namespace: { type: "string", description: "Provider namespace (e.g. 'hashicorp')" },
        version: { type: "string", description: "Provider version (defaults to latest)" }
      }
    }
    // Removed handler from here, it's used in the CallTool handler below
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
    name: "moduleSearch",
    description: "Search for and recommend Terraform modules based on a query.",
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
    name: "listDataSources",
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
    description:
      "Fetches comprehensive details about a specific resource type's arguments, including required and optional attributes, nested blocks, and their descriptions.",
    inputSchema: {
      type: "object",
      properties: {
        provider: { type: "string", description: "Provider name (e.g. 'aws')" },
        namespace: { type: "string", description: "Provider namespace (e.g. 'hashicorp')" },
        resource: { type: "string", description: "Resource name (e.g. 'aws_instance')" },
        version: { type: "string", description: "Provider version (defaults to latest)" }
      },
      required: ["provider", "namespace", "resource"]
    }
  },
  {
    name: "moduleDetails",
    description:
      "Retrieves detailed metadata for a Terraform module including versions, inputs, outputs, and dependencies.",
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
    }
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
    }
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
    }
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
    }
  }
];
// Define the TFC-specific tools (original structure)
const tfcTools: Tool[] = [
  {
    name: "listOrganizations",
    description: "List all organizations the authenticated user has access to in Terraform Cloud.",
    inputSchema: {
      type: "object",
      properties: {}
    }
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
    }
  },
  {
    name: "privateModuleDetails",
    description:
      "Get detailed information about a private module including inputs, outputs, and no-code configuration.",
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
    }
  },
  {
    name: "explorerQuery",
    description: "Query the Terraform Cloud Explorer API to analyze data across workspaces in an organization",
    inputSchema: {
      type: "object",
      required: ["organization", "type"],
      properties: {
        organization: {
          type: "string",
          description: "The name of the organization to query"
        },
        type: {
          type: "string",
          enum: ["workspaces", "tf_versions", "providers", "modules"],
          description: "The type of view to query"
        },
        sort: {
          type: "string",
          description: "Optional field to sort by (prefix with - for descending)"
        },
        filter: {
          type: "array",
          items: {
            type: "object",
            required: ["field", "operator", "value"],
            properties: {
              field: { type: "string" },
              operator: { type: "string" },
              value: { type: "array", items: { type: "string" } }
            }
          },
          description: "Optional filters to apply"
        },
        fields: {
          type: "array",
          items: { type: "string" },
          description: "Optional specific fields to return"
        },
        page_number: {
          type: "number",
          description: "Optional page number"
        },
        page_size: {
          type: "number",
          description: "Optional page size"
        }
      }
    }
  },
  {
    name: "listWorkspaces",
    description: "List workspaces in a Terraform Cloud organization",
    inputSchema: {
      type: "object",
      required: ["organization"],
      properties: {
        organization: {
          type: "string",
          description: "The name of the organization"
        },
        page_number: {
          type: "number",
          description: "Optional page number"
        },
        page_size: {
          type: "number",
          description: "Optional page size"
        },
        include: {
          type: "array",
          items: { type: "string" },
          description: "Optional related resources to include"
        }
      }
    }
  },
  {
    name: "workspaceDetails",
    description: "Get detailed information about a specific workspace in a Terraform Cloud organization",
    inputSchema: {
      type: "object",
      required: ["organization", "name"],
      properties: {
        organization: {
          type: "string",
          description: "The name of the organization"
        },
        name: {
          type: "string",
          description: "The name of the workspace"
        },
        include: {
          type: "array",
          items: { type: "string" },
          description: "Optional related resources to include"
        }
      }
    }
  },
  {
    name: "lockWorkspace",
    description: "Lock a workspace to prevent runs",
    inputSchema: {
      type: "object",
      required: ["workspace_id"],
      properties: {
        workspace_id: {
          type: "string",
          description: "The ID of the workspace to lock"
        },
        reason: {
          type: "string",
          description: "Optional reason for locking"
        }
      }
    }
  },
  {
    name: "unlockWorkspace",
    description: "Unlock a workspace to allow runs",
    inputSchema: {
      type: "object",
      required: ["workspace_id"],
      properties: {
        workspace_id: {
          type: "string",
          description: "The ID of the workspace to unlock"
        }
      }
    }
  },
  {
    name: "listRuns",
    description: "List runs for a workspace",
    inputSchema: {
      type: "object",
      required: ["workspace_id"],
      properties: {
        workspace_id: {
          type: "string",
          description: "The ID of the workspace"
        },
        page_number: {
          type: "number",
          description: "Optional page number"
        },
        page_size: {
          type: "number",
          description: "Optional page size"
        },
        include: {
          type: "array",
          items: { type: "string" },
          description: "Optional related resources to include"
        }
      }
    }
  },
  {
    name: "runDetails",
    description: "Get detailed information about a specific run",
    inputSchema: {
      type: "object",
      required: ["run_id"],
      properties: {
        run_id: {
          type: "string",
          description: "The ID of the run"
        }
      }
    }
  },
  {
    name: "createRun",
    description: "Create a new run for a workspace",
    inputSchema: {
      type: "object",
      required: ["workspace_id"],
      properties: {
        workspace_id: {
          type: "string",
          description: "The ID of the workspace"
        },
        is_destroy: {
          type: "boolean",
          description: "Optional destroy flag"
        },
        message: {
          type: "string",
          description: "Optional message"
        },
        auto_apply: {
          type: "boolean",
          description: "Optional auto-apply setting"
        },
        refresh: {
          type: "boolean",
          description: "Optional refresh flag"
        },
        refresh_only: {
          type: "boolean",
          description: "Optional refresh-only flag"
        },
        plan_only: {
          type: "boolean",
          description: "Optional plan-only flag"
        },
        terraform_version: {
          type: "string",
          description: "Optional Terraform version"
        }
      }
    }
  },
  {
    name: "applyRun",
    description: "Apply a run that's been planned",
    inputSchema: {
      type: "object",
      required: ["run_id"],
      properties: {
        run_id: {
          type: "string",
          description: "The ID of the run to apply"
        },
        comment: {
          type: "string",
          description: "Optional comment"
        }
      }
    }
  },
  {
    name: "cancelRun",
    description: "Cancel a run that's in progress",
    inputSchema: {
      type: "object",
      required: ["run_id"],
      properties: {
        run_id: {
          type: "string",
          description: "The ID of the run to cancel"
        },
        comment: {
          type: "string",
          description: "Optional comment"
        }
      }
    }
  },
  {
    name: "listWorkspaceResources",
    description: "List resources in a workspace",
    inputSchema: {
      type: "object",
      required: ["workspace_id"],
      properties: {
        workspace_id: {
          type: "string",
          description: "The ID of the workspace"
        },
        page_number: {
          type: "number",
          description: "Optional page number"
        },
        page_size: {
          type: "number",
          description: "Optional page size"
        },
        filter: {
          type: "string",
          description: "Optional filter string"
        }
      }
    }
  }
];

// Combine tools based on TFC_TOKEN availability
const tools: Tool[] = TFC_TOKEN ? [...baseTools, ...tfcTools] : baseTools;

// Reverted: Initialize the low-level Server
const server = new Server(
  {
    name: SERVER_NAME,
    version: VERSION
  },
  {
    capabilities: {
      // Added prompts capability back
      tools: {},
      resources: {
        subscribe: true,
        listChanged: true
      },
      prompts: {}
    }
  }
);

// Log initialization
logger.info("Server constructor created, setting up handlers...");

// Initialize handler (original)
server.setRequestHandler(InitializeRequestSchema, async (request) => {
  logger.info("Received Initialize request!");
  logger.debug("Initialize request details:", request);
  return {
    protocolVersion: request.params.protocolVersion,
    capabilities: {
      // Ensure prompts capability is included here too
      tools: {},
      resources: {
        subscribe: true,
        listChanged: true
      },
      prompts: {}
    },
    serverInfo: {
      name: SERVER_NAME,
      version: VERSION
    }
  };
});

// ListToolsRequest handler (original)
server.setRequestHandler(ListToolsRequestSchema, async () => {
  logger.info("Received ListToolsRequest");
  return { tools };
});

// Define prompts metadata (original)
const promptsMetadata = [
  {
    name: "migrate-clouds",
    description: "Generate Terraform code to migrate infrastructure between cloud providers.",
    arguments: [
      {
        name: "sourceCloud",
        description: "The cloud provider to migrate from (e.g., AWS, Azure, GCP)",
        required: true
      },
      { name: "targetCloud", description: "The cloud provider to migrate to (e.g., AWS, Azure, GCP)", required: true },
      { name: "terraformCode", description: "The Terraform code for the existing infrastructure", required: true }
    ]
  },
  {
    name: "generate-resource-skeleton",
    description: "Helps users quickly scaffold new Terraform resources with best practices.",
    arguments: [
      {
        name: "resourceType",
        description: "The type of Terraform resource to generate (e.g., aws_s3_bucket)",
        required: true
      }
    ]
  },
  {
    name: "optimize-terraform-module",
    description: "Provides actionable recommendations for improving Terraform code.",
    arguments: [{ name: "terraformCode", description: "The Terraform module code to optimize", required: true }]
  },
  {
    name: "migrate-provider-version",
    description: "Assists with provider version upgrades and breaking changes.",
    arguments: [
      { name: "providerName", description: "The name of the Terraform provider (e.g., aws)", required: true },
      { name: "currentVersion", description: "The current version of the provider", required: true },
      { name: "targetVersion", description: "The target version of the provider", required: true },
      { name: "terraformCode", description: "Optional: Relevant Terraform code using the provider", required: false }
    ]
  },
  {
    name: "analyze-workspace-runs",
    description: "Analyzes recent run failures and provides troubleshooting guidance for Terraform Cloud workspaces.",
    arguments: [
      { name: "workspaceId", description: "The Terraform Cloud workspace ID to analyze", required: true },
      { name: "runsToAnalyze", description: "Number of recent runs to analyze (default: 5)", required: false }
    ]
  }
];

// ListPrompts handler (original)
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  logger.info("Received ListPrompts request!");
  return { prompts: promptsMetadata };
});

// GetPrompt handler with proper error handling
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name: promptName, arguments: args } = request.params;
  logger.info(`Received GetPrompt request for: ${promptName}`);
  logger.debug("GetPrompt arguments:", args);

  try {
    // Find metadata for the requested prompt
    const metadata = promptsMetadata.find((p) => p.name === promptName);
    if (!metadata) {
      logger.error(`Prompt metadata not found for: ${promptName}`);
      logger.info(`Returning error for unknown prompt: ${promptName}`);
      return {
        messages: [],
        error: {
          code: -32000,
          message: `Unknown prompt: ${promptName}`
        }
      };
    }
    logger.debug(`Found metadata for ${promptName}:`, metadata);

    // Validate required arguments
    for (const argDef of metadata.arguments) {
      if (argDef.required && !(args && argDef.name in args)) {
        logger.error(`Missing required argument '${argDef.name}' for prompt '${promptName}'`);
        logger.info(`Returning error for missing required argument: ${argDef.name}`);
        return {
          messages: [],
          error: {
            code: -32000,
            message: `Missing required argument '${argDef.name}' for prompt '${promptName}'`
          }
        };
      }
    }
    logger.debug(`Arguments validated successfully for ${promptName}`);

    let text = "";
    switch (promptName) {
      case "migrate-clouds":
        text = `Please help migrate the following Terraform code from ${args?.sourceCloud} to ${args?.targetCloud}:\n\n\`\`\`terraform\n${args?.terraformCode}\n\`\`\``;
        break;
      case "generate-resource-skeleton":
        text = `Please generate a skeleton for the Terraform resource type: ${args?.resourceType}`;
        break;
      case "optimize-terraform-module":
        text = `Please optimize the following Terraform module code:\n\n\`\`\`terraform\n${args?.terraformCode}\n\`\`\``;
        break;
      case "migrate-provider-version":
        text = `Please help migrate provider ${args?.providerName} from version ${args?.currentVersion} to ${args?.targetVersion}.\n${args?.terraformCode ? `\nHere is the current Terraform code:\n\n\`\`\`terraform\n${args?.terraformCode}\n\`\`\`` : ""}`;
        break;
      case "analyze-workspace-runs":
        text = `Please analyze the last ${args?.runsToAnalyze || 5} run(s) for Terraform Cloud workspace ${args?.workspaceId}. Identify any common failure patterns, suggest troubleshooting steps, and recommend configuration improvements to prevent future issues.`;
        break;
      default:
        logger.error(`Unhandled prompt name in switch statement: ${promptName}`);
        return {
          messages: [],
          error: {
            code: -32000,
            message: `Logic not implemented for prompt: ${promptName}`
          }
        };
    }
    logger.debug(`Constructed text for ${promptName}:`, text);

    const responsePayload = {
      description: metadata.description,
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: text
          }
        }
      ]
    };
    logger.info(`Returning GetPrompt response for ${promptName}`);
    logger.debug(`GetPrompt response payload for ${promptName}:`, responsePayload);
    return responsePayload;
  } catch (error) {
    // Catch any unexpected errors
    logger.error(`Unexpected error in GetPrompt handler for ${promptName}:`, error);
    return {
      messages: [],
      error: {
        code: -32000,
        message: error instanceof Error ? error.message : String(error)
      }
    };
  }
});

// Resource Handlers (original)
server.setRequestHandler(ListResourcesRequestSchema, async (request: ListResourcesRequest) => {
  logger.info("Received resources/list request!");
  const uri = request.params?.uri;
  if (typeof uri !== "string") {
    throw new Error("Missing or invalid 'uri' parameter in resources/list request");
  }
  return await handleResourcesList(uri);
});
server.setRequestHandler(ReadResourceRequestSchema, async (request: ReadResourceRequest) => {
  logger.info("Received resources/read request!");
  const uri = request.params?.uri;
  if (!uri) {
    throw new Error("Missing 'uri' parameter in resources/read request");
  }
  return await handleResourcesRead(uri);
});
server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => {
  logger.info("Received resources/templates/list request!");
  // Original handler didn't use uri, assuming correct
  return await handleResourcesTemplatesList();
});
server.setRequestHandler(SubscribeRequestSchema, async () => {
  logger.info("Received resources/subscribe request!");
  // Original handler didn't use uri, assuming correct
  return await handleResourcesSubscribe();
});

// validateArgs function (original)
function validateArgs<T>(args: Record<string, unknown> | undefined, requiredFields: string[]): T | undefined {
  if (!args) return undefined;

  for (const field of requiredFields) {
    if (!(field in args)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  return args as T;
}

// CallTool handler (original)
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name: toolName, arguments: args } = request.params;

  if (!toolName) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            status: "error",
            error: "Tool name is required"
          })
        }
      ]
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
      case "providerDetails": {
        const validArgs = validateArgs<ProviderLookupInput>(args, ["provider"]);
        if (!validArgs) throw new Error("Missing required arguments");
        response = await handleProviderLookup(validArgs);
        break;
      }
      case "moduleSearch": {
        const validArgs = validateArgs<ModuleRecommendationsInput>(args, ["query"]);
        if (!validArgs) throw new Error("Missing required arguments");
        response = await handleModuleRecommendations(validArgs);
        break;
      }
      case "listDataSources": {
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
        const validArgs = validateArgs<PrivateModuleDetailsParams>(args, [
          "organization",
          "namespace",
          "name",
          "provider"
        ]);
        if (!validArgs) throw new Error("Missing required arguments");
        response = await handlePrivateModuleDetails(validArgs);
        break;
      }
      case "explorerQuery": {
        const validArgs = validateArgs<ExplorerQueryParams>(args, ["organization", "type"]);
        if (!validArgs) throw new Error("Missing required arguments");
        response = await handleExplorerQuery(validArgs);
        break;
      }
      case "listWorkspaces": {
        const validArgs = validateArgs<WorkspacesQueryParams>(args, ["organization"]);
        if (!validArgs) throw new Error("Missing required arguments");
        response = await handleListWorkspaces(validArgs);
        break;
      }
      case "workspaceDetails": {
        const validArgs = validateArgs<Record<string, any>>(args, ["organization", "name"]);
        if (!validArgs) throw new Error("Missing required arguments");
        const params = {
          organization_name: validArgs.organization,
          name: validArgs.name
        };
        response = await handleShowWorkspace(params);
        break;
      }
      case "lockWorkspace": {
        const validArgs = validateArgs<WorkspaceActionParams>(args, ["workspace_id"]);
        if (!validArgs) throw new Error("Missing required arguments");
        response = await handleLockWorkspace(validArgs);
        break;
      }
      case "unlockWorkspace": {
        const validArgs = validateArgs<WorkspaceActionParams>(args, ["workspace_id"]);
        if (!validArgs) throw new Error("Missing required arguments");
        response = await handleUnlockWorkspace(validArgs);
        break;
      }
      case "listRuns": {
        const validArgs = validateArgs<RunsQueryParams>(args, ["workspace_id"]);
        if (!validArgs) throw new Error("Missing required arguments");
        response = await handleListRuns(validArgs);
        break;
      }
      case "runDetails": {
        const validArgs = validateArgs<RunActionParams>(args, ["run_id"]);
        if (!validArgs) throw new Error("Missing required arguments");
        response = await handleShowRun(validArgs);
        break;
      }
      case "createRun": {
        const validArgs = validateArgs<RunCreateParams>(args, ["workspace_id"]);
        if (!validArgs) throw new Error("Missing required arguments");
        response = await handleCreateRun(validArgs);
        break;
      }
      case "applyRun": {
        const validArgs = validateArgs<RunActionParams>(args, ["run_id"]);
        if (!validArgs) throw new Error("Missing required arguments");
        response = await handleApplyRun(validArgs);
        break;
      }
      case "cancelRun": {
        const validArgs = validateArgs<RunActionParams>(args, ["run_id"]);
        if (!validArgs) throw new Error("Missing required arguments");
        response = await handleCancelRun(validArgs);
        break;
      }
      case "listWorkspaceResources": {
        const validArgs = validateArgs<WorkspaceResourcesQueryParams>(args, ["workspace_id"]);
        if (!validArgs) throw new Error("Missing required arguments");
        response = await handleListWorkspaceResources(validArgs);
        break;
      }
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }

    return response;
  } catch (error) {
    logger.error("Error handling tool request:", error);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            status: "error",
            error: error instanceof Error ? error.message : String(error)
          })
        }
      ]
    };
  }
});

// Start the server (original)
async function main() {
  console.error(`🚀 Starting ${SERVER_NAME} MCP server v${VERSION}...`);
  const transport = new StdioServerTransport();

  process.on("unhandledRejection", (reason) => {
    console.error("💥 Unhandled Promise Rejection:", reason);
  });

  try {
    await server.connect(transport);
    console.error("✅ Server connected and ready for requests via stdio");
  } catch (error) {
    console.error("❌ Fatal error during server connection:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("💀 Fatal error in main function:", error);
  process.exit(1);
});

/* NOTE: Ellipses (...) indicate original code blocks that were collapsed for brevity */
