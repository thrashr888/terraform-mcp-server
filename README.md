[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/thrashr888-terraform-mcp-server-badge.png)](https://mseep.ai/app/thrashr888-terraform-mcp-server)

# Terraform Registry MCP Server

A Model Context Protocol (MCP) server that provides tools for interacting with the Terraform Registry API. This server enables AI agents to query provider information, resource details, and module metadata.

## Installation

### Installing in Cursor

To install and use this MCP server in [Cursor](https://cursor.sh/):

1. In Cursor, open Settings (⌘+,) and navigate to the "MCP" tab.
   
2. Click "+ Add new MCP server."
   
3. Enter the following:
   - Name: terraform-registry
   - Type: command
   - Command: npx -y terraform-mcp-server
   
4. Click "Add" then scroll to the server and click "Disabled" to enable the server.

5. Restart Cursor, if needed, to ensure the MCP server is properly loaded.

![terraform-registry MCP settings for Cursor](https://github.com/user-attachments/assets/6809dd48-d0fe-4318-b7f6-94ca7970b73a)

### Installing in Claude Desktop

To install and use this MCP server in Claude Desktop:

1. In Claude Desktop, open Settings (⌘+,) and navigate to the "Developer" tab.

2. Click "Edit Config" at the bottom of the window.

3. Edit the file (`~/Library/Application Support/Claude/claude_desktop_config.json`) to add the following code, then Save the file.

```json
{
  "mcpServers": {
    "terraform-registry": {
      "command": "npx",
      "args": ["-y", "terraform-mcp-server"]
    }
  }
}
```

4. Restart Claude Desktop to ensure the MCP server is properly loaded.

## Tools

The following tools are available in this MCP server:

### Core Registry Tools

| Tool | Description |
|------|-------------|
| `providerDetails` | Gets detailed information about a Terraform provider |
| `resourceUsage` | Gets example usage of a Terraform resource and related resources |
| `moduleSearch` | Searches for and recommends Terraform modules based on a query |
| `listDataSources` | Lists all available data sources for a provider and their basic details |
| `resourceArgumentDetails` | Fetches comprehensive details about a resource type's arguments |
| `moduleDetails` | Retrieves detailed metadata for a Terraform module |
| `functionDetails` | Gets details about a Terraform provider function |
| `providerGuides` | Lists and views provider-specific guides and documentation |
| `policySearch` | Searches for policy libraries in the Terraform Registry |
| `policyDetails` | Gets detailed information about a specific policy library |

### Terraform Cloud Tools

These tools require a Terraform Cloud API token (`TFC_TOKEN`):

| Tool | Description |
|------|-------------|
| `listOrganizations` | Lists all organizations the authenticated user has access to |
| `privateModuleSearch` | Searches for private modules in an organization |
| `privateModuleDetails` | Gets detailed information about a private module |
| `explorerQuery` | Queries the Terraform Cloud Explorer API to analyze data |
| `listWorkspaces` | Lists workspaces in an organization |
| `workspaceDetails` | Gets detailed information about a specific workspace |
| `lockWorkspace` | Locks a workspace to prevent runs |
| `unlockWorkspace` | Unlocks a workspace to allow runs |
| `listRuns` | Lists runs for a workspace |
| `runDetails` | Gets detailed information about a specific run |
| `createRun` | Creates a new run for a workspace |
| `applyRun` | Applies a run that's been planned |
| `cancelRun` | Cancels a run that's in progress |
| `listWorkspaceResources` | Lists resources in a workspace |

## Resources

The MCP server supports the following resource URIs for listing and reading via the `resources/*` methods:

| Resource Type | Example URI(s) | Description |
|---------------|----------------|-------------|
| **Providers** | `terraform:providers` | List all namespaces/providers |
|               | `terraform:provider:<namespace>/<name>` | Get details for a specific provider |
| **Provider Versions** | `terraform:provider:<namespace>/<name>/versions` | List available versions for a provider |
| **Provider Resources** | `terraform:provider:<namespace>/<name>/resources` | List resources for a provider |
|                 | `terraform:resource:<namespace>/<name>/<resource_name>` | Get details for a specific resource type |
| **Provider Data Sources** | `terraform:provider:<namespace>/<name>/dataSources` | List data sources for a provider |
|                       | `terraform:dataSource:<namespace>/<name>/<data_source_name>` | Get details for a specific data source |
| **Provider Functions** | `terraform:provider:<namespace>/<name>/functions` | List functions for a provider |
|                      | `terraform:function:<namespace>/<name>/<function_name>` | Get details for a specific function |

The server also supports `resources/templates/list` to provide templates for creating:
- `terraform:provider`
- `terraform:resource`
- `terraform:dataSource`

## Prompts

The following prompts are available for generating contextual responses:

| Prompt | Description | Required Arguments |
|--------|-------------|-------------------|
| `migrate-clouds` | Generate Terraform code to migrate infrastructure between cloud providers | `sourceCloud`, `targetCloud`, `terraformCode` |
| `generate-resource-skeleton` | Helps users quickly scaffold new Terraform resources with best practices | `resourceType` |
| `optimize-terraform-module` | Provides actionable recommendations for improving Terraform code | `terraformCode` |
| `migrate-provider-version` | Assists with provider version upgrades and breaking changes | `providerName`, `currentVersion`, `targetVersion`, `terraformCode` (optional) |
| `analyze-workspace-runs` | Analyzes recent run failures and provides troubleshooting guidance for Terraform Cloud workspaces | `workspaceId`, `runsToAnalyze` (optional, default: 5) |

### Known Issues with Prompts

**Note**: There is a known issue with the `getPrompt` functionality that can cause server crashes. The server properly registers prompts and can list them, but direct requests using the `getPrompt` method may cause connectivity issues. This is being investigated and may be related to SDK compatibility or implementation details. Until resolved, use `listPrompts` to see available prompts but avoid direct `getPrompt` calls. 

## Running the Server

The server runs using stdio transport for MCP communication:

```bash
npm install
npm start
```

### Configuration with Environment Variables

The server can be configured using environment variables:

| Environment Variable | Description | Default Value |
|---------------------|-------------|---------------|
| `TERRAFORM_REGISTRY_URL` | Base URL for Terraform Registry API | https://registry.terraform.io |
| `DEFAULT_PROVIDER_NAMESPACE` | Default namespace for providers | hashicorp |
| `LOG_LEVEL` | Logging level (error, warn, info, debug) | info |
| `REQUEST_TIMEOUT_MS` | Timeout for API requests in milliseconds | 10000 |
| `RATE_LIMIT_ENABLED` | Enable rate limiting for API requests | false |
| `RATE_LIMIT_REQUESTS` | Number of requests allowed in time window | 60 |
| `RATE_LIMIT_WINDOW_MS` | Time window for rate limiting in milliseconds | 60000 |
| `TFC_TOKEN` | Terraform Cloud API token for private registry access (optional) | |

Example usage with environment variables:

```bash
# Set environment variables
export LOG_LEVEL="debug"
export REQUEST_TIMEOUT_MS="15000"
export TFC_TOKEN="your-terraform-cloud-token"

# Run the server
npm start
```

## Testing

See the [TESTS.md](TESTS.md) file for information about testing this project.
