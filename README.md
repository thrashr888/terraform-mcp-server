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

| Tool | Description |
|------|-------------|
| `providerLookup` | Looks up Terraform provider details by name and version |
| `resourceUsage` | Gets example usage of a Terraform resource and related resources |
| `moduleRecommendations` | Searches for and recommends Terraform modules based on a query |
| `dataSourceLookup` | Retrieves available data source identifiers for a given provider |
| `resourceArgumentDetails` | Fetches comprehensive details about a resource type's arguments |
| `moduleDetails` | Retrieves detailed metadata for a Terraform module |
| `functionDetails` | Gets details about a Terraform provider function |
| `providerGuides` | Lists and views provider-specific guides and documentation |
| `policySearch` | Searches for policy libraries in the Terraform Registry |
| `policyDetails` | Gets detailed information about a specific policy library |
| `explorerQuery` | Queries the Terraform Cloud Explorer API to analyze data |
| `workspaces.list` | Lists workspaces in a Terraform Cloud organization |
| `workspaces.show` | Shows details of a specific workspace |
| `workspaces.lock` | Locks a workspace to prevent runs |
| `workspaces.unlock` | Unlocks a workspace to allow runs |
| `runs.list` | Lists runs for a workspace |
| `runs.show` | Shows details of a specific run |
| `runs.create` | Creates a new run for a workspace |
| `runs.apply` | Applies a run that's been planned |
| `runs.cancel` | Cancels a run that's in progress |
| `workspaceResources.list` | Lists resources in a workspace |

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
| `TFC_TOKEN` | Terraform Cloud API token for private registry access | |

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
