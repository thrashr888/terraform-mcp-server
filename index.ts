#!/usr/bin/env node

// Polyfill fetch for Node.js versions < 18
import fetch from "node-fetch";
if (!globalThis.fetch) {
  globalThis.fetch = fetch as unknown as typeof globalThis.fetch;
}

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

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

// Import resource handlers
import { handleResourcesList, handleResourcesRead } from "./src/resources/index.js";

import { VERSION, SERVER_NAME, TFC_TOKEN } from "./config.js";
import logger from "./src/utils/logger.js";

// Import prompt handlers
import { addMigrateCloudsPrompt } from "./src/prompts/migrate-clouds.js";
import { addGenerateResourceSkeletonPrompt } from "./src/prompts/generate-resource-skeleton.js";
import { addOptimizeTerraformModulePrompt } from "./src/prompts/optimize-terraform-module.js";
import { addMigrateProviderVersionPrompt } from "./src/prompts/migrate-provider-version.js";
import { addAnalyzeWorkspaceRunsPrompt } from "./src/prompts/analyze-workspace-runs.js";

// --- Define Zod Shapes for Tools ---

const ProviderLookupShape = {
  provider: z.string().describe("Provider name (e.g. 'aws')"),
  namespace: z.string().optional().describe("Provider namespace (e.g. 'hashicorp')"),
  version: z.string().optional().describe("Provider version (defaults to latest)")
};

const ResourceUsageShape = {
  provider: z.string().describe("Provider name (e.g. 'aws')"),
  resource: z.string().describe("Resource name (e.g. 'aws_instance')"),
  name: z.string().optional().describe("Alternative resource name field (fallback if resource not specified)")
};

const ModuleRecommendationsShape = {
  query: z.string().optional().describe("Search query (e.g. 'vpc')"), // Made optional as keyword is fallback
  keyword: z.string().optional().describe("Alternative search keyword (fallback if query not specified)"),
  provider: z.string().optional().describe("Filter modules by provider (e.g. 'aws')")
};

const DataSourceLookupShape = {
  provider: z.string().describe("Provider name (e.g. 'aws')"),
  namespace: z.string().describe("Provider namespace (e.g. 'hashicorp')")
};

const ResourceDocumentationShape = {
  provider: z.string().describe("Provider name (e.g. 'aws')"),
  namespace: z.string().describe("Provider namespace (e.g. 'hashicorp')"),
  resource: z.string().describe("Resource name (e.g. 'aws_instance')"),
  version: z.string().optional().describe("Provider version (defaults to latest)")
};

const ModuleDetailsShape = {
  namespace: z.string().describe("Module namespace (e.g. 'terraform-aws-modules')"),
  module: z.string().describe("Module name (e.g. 'vpc')"),
  provider: z.string().describe("Provider name (e.g. 'aws')")
};

const FunctionDetailsShape = {
  provider: z.string().describe("Provider name (e.g. 'aws')"),
  namespace: z.string().optional().describe("Provider namespace (e.g. 'hashicorp')"),
  function: z.string().describe("Function name (e.g. 'arn_parse')")
};

const ProviderGuidesShape = {
  provider: z.string().describe("Provider name (e.g. 'aws')"),
  namespace: z.string().optional().describe("Provider namespace (e.g. 'hashicorp')"),
  guide: z.string().optional().describe("Specific guide to fetch (by slug or title)"),
  search: z.string().optional().describe("Search term to filter guides")
};

const PolicySearchShape = {
  query: z.string().optional().describe("Search query for finding policy libraries"),
  provider: z.string().optional().describe("Filter policies by provider (e.g. 'aws')")
};

const PolicyDetailsShape = {
  namespace: z.string().describe("Policy library namespace (e.g. 'Great-Stone')"),
  name: z.string().describe("Policy library name (e.g. 'vault-aws-secret-type')")
};

const ListOrganizationsShape = {}; // No input needed

const PrivateModuleSearchShape = {
  organization: z.string().describe("The organization name to search in"),
  query: z.string().optional().describe("Search term"),
  provider: z.string().optional().describe("Filter by provider"),
  page: z.number().optional().describe("Page number (default: 1)"),
  per_page: z.number().optional().describe("Results per page (default: 20)")
};

const PrivateModuleDetailsShape = {
  organization: z.string().describe("The organization name"),
  namespace: z.string().describe("The module namespace, likely same as organization name"),
  name: z.string().describe("The module name"),
  provider: z.string().describe("The provider name"),
  version: z.string().optional().describe("Optional specific version to fetch")
};

// Note: ExplorerQueryParams might already be a Zod schema, if not, define it
// const ExplorerQuerySchema = ExplorerQueryParams; // Assuming ExplorerQueryParams is a Zod schema
// Define ExplorerQuerySchema based on original inputSchema
const ExplorerQueryShape = {
  organization: z.string().describe("The name of the organization to query"),
  type: z.enum(["workspaces", "tf_versions", "providers", "modules"]).describe("The type of view to query"),
  sort: z.string().optional().describe("Optional field to sort by (prefix with - for descending)"),
  filter: z
    .array(
      z.object({
        field: z.string(),
        operator: z.string(),
        value: z.array(z.string())
      })
    )
    .optional()
    .describe("Optional filters to apply"),
  fields: z.array(z.string()).optional().describe("Optional specific fields to return"),
  page_number: z.number().optional().describe("Optional page number"),
  page_size: z.number().optional().describe("Optional page size")
};

// Note: WorkspacesQueryParams might already be a Zod schema, if not, define it
// const ListWorkspacesSchema = WorkspacesQueryParams.pick({
//   organization: true,
//   page_number: true,
//   page_size: true,
//   include: true
// }); // Assuming WorkspacesQueryParams is Zod
// Define ListWorkspacesSchema based on original inputSchema
const ListWorkspacesShape = {
  organization: z.string().describe("The name of the organization"),
  page_number: z.number().optional().describe("Optional page number"),
  page_size: z.number().optional().describe("Optional page size"),
  include: z.array(z.string()).optional().describe("Optional related resources to include")
};

const WorkspaceDetailsShape = {
  organization: z.string().describe("The name of the organization"),
  name: z.string().describe("The name of the workspace"),
  include: z.array(z.string()).optional().describe("Optional related resources to include")
};

// Note: WorkspaceActionParams might already be a Zod schema, if not, define it
// const LockWorkspaceSchema = WorkspaceActionParams.pick({
//   workspace_id: true,
//   reason: true
// }); // Assuming WorkspaceActionParams is Zod
// Define LockWorkspaceSchema based on original inputSchema
const LockWorkspaceShape = {
  workspace_id: z.string().describe("The ID of the workspace to lock"),
  reason: z.string().optional().describe("Optional reason for locking")
};

// const UnlockWorkspaceSchema = WorkspaceActionParams.pick({
//   workspace_id: true
// }); // Assuming WorkspaceActionParams is Zod
// Define UnlockWorkspaceSchema based on original inputSchema
const UnlockWorkspaceShape = {
  workspace_id: z.string().describe("The ID of the workspace to unlock")
};

// Note: RunsQueryParams might already be a Zod schema, if not, define it
// const ListRunsSchema = RunsQueryParams; // Assuming RunsQueryParams is a Zod schema
// Define ListRunsSchema based on original inputSchema
const ListRunsShape = {
  workspace_id: z.string().describe("The ID of the workspace"),
  page_number: z.number().optional().describe("Optional page number"),
  page_size: z.number().optional().describe("Optional page size"),
  include: z.array(z.string()).optional().describe("Optional related resources to include")
};

// Note: RunActionParams might already be a Zod schema, if not, define it
// const RunDetailsSchema = RunActionParams.pick({ run_id: true }); // Assuming RunActionParams is Zod
// Define RunDetailsSchema based on original inputSchema
const RunDetailsShape = {
  run_id: z.string().describe("The ID of the run")
};

// Note: RunCreateParams might already be a Zod schema, if not, define it
// const CreateRunSchema = RunCreateParams; // Assuming RunCreateParams is a Zod schema
// Define CreateRunSchema based on original inputSchema
const CreateRunShape = {
  workspace_id: z.string().describe("The ID of the workspace"),
  is_destroy: z.boolean().optional().describe("Optional destroy flag"),
  message: z.string().optional().describe("Optional message"),
  auto_apply: z.boolean().optional().describe("Optional auto-apply setting"),
  refresh: z.boolean().optional().describe("Optional refresh flag"),
  refresh_only: z.boolean().optional().describe("Optional refresh-only flag"),
  plan_only: z.boolean().optional().describe("Optional plan-only flag"),
  terraform_version: z.string().optional().describe("Optional Terraform version")
};

// const ApplyRunSchema = RunActionParams.pick({ run_id: true, comment: true }); // Assuming RunActionParams is Zod
// Define ApplyRunSchema based on original inputSchema
const ApplyRunShape = {
  run_id: z.string().describe("The ID of the run to apply"),
  comment: z.string().optional().describe("Optional comment")
};

// const CancelRunSchema = RunActionParams.pick({ run_id: true, comment: true }); // Assuming RunActionParams is Zod
// Define CancelRunSchema based on original inputSchema
const CancelRunShape = {
  run_id: z.string().describe("The ID of the run to cancel"),
  comment: z.string().optional().describe("Optional comment")
};

// Note: WorkspaceResourcesQueryParams might already be a Zod schema, if not, define it
// const ListWorkspaceResourcesSchema = WorkspaceResourcesQueryParams; // Assuming WorkspaceResourcesQueryParams is Zod
// Define ListWorkspaceResourcesSchema based on original inputSchema
const ListWorkspaceResourcesShape = {
  workspace_id: z.string().describe("The ID of the workspace"),
  page_number: z.number().optional().describe("Optional page number"),
  page_size: z.number().optional().describe("Optional page size"),
  filter: z.string().optional().describe("Optional filter string")
};

// --- Instantiate McpServer ---
const server = new McpServer({
  name: SERVER_NAME,
  version: VERSION
  // McpServer automatically sets capabilities based on registered items
});

// Log initialization
logger.info("McpServer created, setting up handlers...");

// --- Register Base Tools ---
server.tool("providerDetails", ProviderLookupShape, async (args) => {
  // Ensure return type matches McpServer expectation
  const result = await handleProviderLookup(args);
  // Assuming handleProviderLookup returns { content: [{ text: string }] }
  // Explicitly set type: "text"
  return {
    ...result,
    content: result.content.map((c) => ({ type: "text", text: c.text }))
  };
});

server.tool("resourceUsage", ResourceUsageShape, async (args) => {
  // Handle potential missing resource/name if needed, or ensure schema requires one
  if (!args.resource && !args.name) {
    throw new Error("Either 'resource' or 'name' must be provided for resourceUsage");
  }
  const result = await handleResourceUsage(args);
  return {
    ...result,
    content: result.content.map((c) => ({ type: "text", text: c.text }))
  };
});

server.tool("moduleSearch", ModuleRecommendationsShape, async (args) => {
  if (!args.query && !args.keyword) {
    throw new Error("Either 'query' or 'keyword' must be provided for moduleSearch");
  }
  const result = await handleModuleRecommendations(args);
  return {
    ...result,
    content: result.content.map((c) => ({ type: "text", text: c.text }))
  };
});

server.tool("listDataSources", DataSourceLookupShape, async (args) => {
  const result = await handleDataSourceLookup(args);
  return {
    ...result,
    content: result.content.map((c) => ({ type: "text", text: c.text }))
  };
});

server.tool("resourceArgumentDetails", ResourceDocumentationShape, async (args) => {
  const result = await handleResourceArgumentDetails(args);
  return {
    ...result,
    content: result.content.map((c) => ({ type: "text", text: c.text }))
  };
});

server.tool("moduleDetails", ModuleDetailsShape, async (args) => {
  const result = await handleModuleDetails(args);
  return {
    ...result,
    content: result.content.map((c) => ({ type: "text", text: c.text }))
  };
});

server.tool("functionDetails", FunctionDetailsShape, async (args) => {
  const result = await handleFunctionDetails(args);
  return {
    ...result,
    content: result.content.map((c) => ({ type: "text", text: c.text }))
  };
});

server.tool("providerGuides", ProviderGuidesShape, async (args) => {
  const result = await handleProviderGuides(args);
  return {
    ...result,
    content: result.content.map((c) => ({ type: "text", text: c.text }))
  };
});

server.tool("policySearch", PolicySearchShape, async (args) => {
  if (!args.query) {
    // Assuming query is the primary way to search, adjust if needed
    throw new Error("'query' must be provided for policySearch");
  }
  const result = await handlePolicySearch(args);
  return {
    ...result,
    content: result.content.map((c) => ({ type: "text", text: c.text }))
  };
});

server.tool("policyDetails", PolicyDetailsShape, async (args) => {
  const result = await handlePolicyDetails(args);
  return {
    ...result,
    content: result.content.map((c) => ({ type: "text", text: c.text }))
  };
});

// --- Register TFC Tools (if TFC_TOKEN is set) ---
if (TFC_TOKEN) {
  logger.info("TFC_TOKEN detected, registering Terraform Cloud tools...");
  server.tool("listOrganizations", ListOrganizationsShape, async () => {
    const result = await handleListOrganizations();
    return {
      ...result,
      content: result.content.map((c) => ({ type: "text", text: c.text }))
    };
  });

  server.tool("privateModuleSearch", PrivateModuleSearchShape, async (args) => {
    const result = await handlePrivateModuleSearch(args);
    return {
      ...result,
      content: result.content.map((c) => ({ type: "text", text: c.text }))
    };
  });

  server.tool("privateModuleDetails", PrivateModuleDetailsShape, async (args) => {
    const result = await handlePrivateModuleDetails(args);
    return {
      ...result,
      content: result.content.map((c) => ({ type: "text", text: c.text }))
    };
  });

  server.tool("explorerQuery", ExplorerQueryShape, async (args) => {
    const result = await handleExplorerQuery(args);
    return {
      ...result,
      content: result.content.map((c) => ({ type: "text", text: c.text }))
    };
  });

  server.tool("listWorkspaces", ListWorkspacesShape, async (args) => {
    const result = await handleListWorkspaces(args);
    return {
      ...result,
      content: result.content.map((c) => ({ type: "text", text: c.text }))
    };
  });

  server.tool("workspaceDetails", WorkspaceDetailsShape, async (args) => {
    // Adapt args for the handler if needed
    const result = await handleShowWorkspace({
      organization_name: args.organization,
      name: args.name,
      // Pass include directly if the handler supports it, otherwise map
      ...(args.include && { include: args.include.join(",") }) // Example if handler expects comma-separated string
    });
    return {
      ...result,
      content: result.content.map((c) => ({ type: "text", text: c.text }))
    };
  });

  server.tool("lockWorkspace", LockWorkspaceShape, async (args) => {
    const result = await handleLockWorkspace(args);
    return {
      ...result,
      content: result.content.map((c) => ({ type: "text", text: c.text }))
    };
  });

  server.tool("unlockWorkspace", UnlockWorkspaceShape, async (args) => {
    const result = await handleUnlockWorkspace(args);
    return {
      ...result,
      content: result.content.map((c) => ({ type: "text", text: c.text }))
    };
  });

  server.tool("listRuns", ListRunsShape, async (args) => {
    const result = await handleListRuns(args);
    return {
      ...result,
      content: result.content.map((c) => ({ type: "text", text: c.text }))
    };
  });

  server.tool("runDetails", RunDetailsShape, async (args) => {
    const result = await handleShowRun(args);
    return {
      ...result,
      content: result.content.map((c) => ({ type: "text", text: c.text }))
    };
  });

  server.tool("createRun", CreateRunShape, async (args) => {
    const result = await handleCreateRun(args);
    return {
      ...result,
      content: result.content.map((c) => ({ type: "text", text: c.text }))
    };
  });

  server.tool("applyRun", ApplyRunShape, async (args) => {
    const result = await handleApplyRun(args);
    return {
      ...result,
      content: result.content.map((c) => ({ type: "text", text: c.text }))
    };
  });

  server.tool("cancelRun", CancelRunShape, async (args) => {
    const result = await handleCancelRun(args);
    return {
      ...result,
      content: result.content.map((c) => ({ type: "text", text: c.text }))
    };
  });

  server.tool("listWorkspaceResources", ListWorkspaceResourcesShape, async (args) => {
    const result = await handleListWorkspaceResources(args);
    return {
      ...result,
      content: result.content.map((c) => ({ type: "text", text: c.text }))
    };
  });
} else {
  logger.warn("TFC_TOKEN not set, skipping Terraform Cloud tool registration.");
}

// --- Register Prompts ---
function registerPrompts(server: McpServer) {
  try {
    logger.info("Registering prompts...");

    // Register each prompt with error handling
    try {
      logger.debug("Registering migrate-clouds prompt");
      addMigrateCloudsPrompt(server);
      logger.debug("Successfully registered migrate-clouds prompt");
    } catch (error) {
      logger.error("Failed to register migrate-clouds prompt:", error);
    }

    try {
      logger.debug("Registering generate-resource-skeleton prompt");
      addGenerateResourceSkeletonPrompt(server);
      logger.debug("Successfully registered generate-resource-skeleton prompt");
    } catch (error) {
      logger.error("Failed to register generate-resource-skeleton prompt:", error);
    }

    try {
      logger.debug("Registering optimize-terraform-module prompt");
      addOptimizeTerraformModulePrompt(server);
      logger.debug("Successfully registered optimize-terraform-module prompt");
    } catch (error) {
      logger.error("Failed to register optimize-terraform-module prompt:", error);
    }

    try {
      logger.debug("Registering migrate-provider-version prompt");
      addMigrateProviderVersionPrompt(server);
      logger.debug("Successfully registered migrate-provider-version prompt");
    } catch (error) {
      logger.error("Failed to register migrate-provider-version prompt:", error);
    }

    try {
      logger.debug("Registering analyze-workspace-runs prompt");
      addAnalyzeWorkspaceRunsPrompt(server);
      logger.debug("Successfully registered analyze-workspace-runs prompt");
    } catch (error) {
      logger.error("Failed to register analyze-workspace-runs prompt:", error);
    }

    logger.info("All prompts registered successfully");
  } catch (error) {
    logger.error("Fatal error during prompt registration:", error);
  }
}

// --- Register Resources ---
function registerResources(server: McpServer) {
  try {
    logger.info("Registering resources...");

    // Register basic root resources
    server.resource("registry", "registry://", async () => {
      logger.debug("Read requested for registry://");
      return {
        contents: [
          {
            uri: "registry://",
            text: JSON.stringify({
              type: "success",
              resources: [
                {
                  uri: "registry://",
                  title: "Terraform Registry Resources"
                }
              ]
            })
          }
        ]
      };
    });

    server.resource("registry-providers", "registry://providers", async () => {
      logger.debug("Read requested for registry://providers");
      const result = await handleResourcesList("registry://providers");
      return {
        contents: [
          {
            uri: "registry://providers",
            text: JSON.stringify(result)
          }
        ]
      };
    });

    server.resource("registry-modules", "registry://modules", async () => {
      logger.debug("Read requested for registry://modules");
      const result = await handleResourcesList("registry://modules");
      return {
        contents: [
          {
            uri: "registry://modules",
            text: JSON.stringify(result)
          }
        ]
      };
    });

    // Registry provider detail resources
    server.resource("registry-provider-aws", "registry://providers/hashicorp/aws", async () => {
      logger.debug("Read requested for registry://providers/hashicorp/aws");
      const result = await handleResourcesRead("registry://providers/hashicorp/aws");
      return {
        contents: [
          {
            uri: "registry://providers/hashicorp/aws",
            text: JSON.stringify(result)
          }
        ]
      };
    });

    // AWS resources
    server.resource(
      "registry-provider-aws-resources-instance",
      "registry://providers/hashicorp/aws/resources/aws_instance",
      async () => {
        logger.debug("Read requested for registry://providers/hashicorp/aws/resources/aws_instance");
        const result = await handleResourcesRead("registry://providers/hashicorp/aws/resources/aws_instance");
        return {
          contents: [
            {
              uri: "registry://providers/hashicorp/aws/resources/aws_instance",
              text: JSON.stringify(result)
            }
          ]
        };
      }
    );

    // AWS data sources
    server.resource(
      "registry-provider-aws-data-sources",
      "registry://providers/hashicorp/aws/data-sources",
      async () => {
        logger.debug("Read requested for registry://providers/hashicorp/aws/data-sources");
        const result = await handleResourcesList("registry://providers/hashicorp/aws/data-sources");
        return {
          contents: [
            {
              uri: "registry://providers/hashicorp/aws/data-sources",
              text: JSON.stringify(result)
            }
          ]
        };
      }
    );

    // TFC resources (if token is available)
    if (TFC_TOKEN) {
      // Organizations list
      server.resource("terraform-organizations", "terraform://organizations", async () => {
        logger.debug("Read requested for terraform://organizations");
        const result = await handleResourcesList("terraform://organizations");
        return {
          contents: [
            {
              uri: "terraform://organizations",
              text: JSON.stringify(result)
            }
          ]
        };
      });

      // Basic workspace list for tests
      server.resource("terraform-org-workspaces", "terraform://organizations/test-org/workspaces", async () => {
        logger.debug("Read requested for terraform://organizations/test-org/workspaces");
        const result = await handleResourcesList("terraform://organizations/test-org/workspaces");
        return {
          contents: [
            {
              uri: "terraform://organizations/test-org/workspaces",
              text: JSON.stringify(result)
            }
          ]
        };
      });
    } else {
      logger.warn("TFC_TOKEN not set, skipping Terraform Cloud resource registration.");
    }

    logger.info("Resources registered successfully");
  } catch (error) {
    logger.error("Error registering resources:", error);
  }
}

// --- Start the server ---
async function main() {
  console.error(`🚀 Starting ${SERVER_NAME} MCP server v${VERSION} using McpServer...`);
  const transport = new StdioServerTransport();

  process.on("unhandledRejection", (reason) => {
    console.error("💥 Unhandled Promise Rejection:", reason);
    // Consider more robust error handling or process exit depending on severity
  });

  try {
    // Register prompts before connecting
    registerPrompts(server);

    // Register resources before connecting
    registerResources(server);

    // McpServer handles connection internally
    await server.connect(transport);
    console.error("✅ McpServer connected and ready for requests via stdio");
  } catch (error) {
    console.error("❌ Fatal error during McpServer connection:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("💀 Fatal error in main function:", error);
  process.exit(1);
});
