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

## Testing

For information about testing this project, please see the [TESTS.md](TESTS.md) file.

## Tools

### 1. Provider Lookup

Looks up Terraform provider details by name, returning the latest version and version count.

**Input:**

```json
{
  "provider": "aws",             // Required: Provider name
  "namespace": "hashicorp",      // Optional: Provider namespace (defaults to "hashicorp")
  "version": "latest"            // Optional: Provider version
}
```

**Output:**

```json
{
  "content": [
    {
      "type": "text",
      "text": "Provider hashicorp/aws: latest version is 5.0.0 (out of 150 versions)."
    }
  ]
}
```

### 2. Resource Usage

Gets example usage of a Terraform resource and related resources.

**Input:**

```json
{
  "provider": "aws",             // Required: Provider name
  "resource": "aws_instance"     // Required: Resource name
}
```

**Output:**

```json
{
  "content": [
    {
      "type": "text",
      "text": "Example usage for aws_instance:\n```terraform\n[example code]\n```\nRelated resources: aws_vpc, aws_subnet"
    }
  ]
}
```

### 3. Module Recommendations

Searches for and recommends Terraform modules based on a query.

**Input:**

```json
{
  "query": "vpc",                // Required: Search query
  "provider": "aws"              // Optional: Filter modules by provider
}
```

**Output:**

```json
{
  "content": [
    {
      "type": "text",
      "text": "Recommended modules for \"vpc\":\n1. terraform-aws-modules/vpc (aws) - AWS VPC Terraform module\n..."
    }
  ]
}
```

### 4. Data Source Lookup

Retrieves available data source identifiers for a given Terraform provider.

**Input:**

```json
{
  "provider": "aws",             // Required: Provider name
  "namespace": "hashicorp"       // Required: Provider namespace
}
```

**Output:**

```json
{
  "content": [{
    "type": "text",
    "text": {
      "data_sources": ["aws_ami", "aws_instance", "aws_vpc", ...]
    }
  }]
}
```

### 5. Resource Argument Details

Fetches comprehensive details about a specific resource type's arguments, including required and optional attributes, nested blocks, and their descriptions.

**Input:**

```json
{
  "provider": "aws",             // Required: Provider name
  "namespace": "hashicorp",      // Required: Provider namespace
  "resource": "aws_instance"     // Required: Resource name
}
```

**Output:**

```
Resource: aws_instance

REQUIRED ATTRIBUTES:
  * ami (string)
      The AMI to use for the instance.

OPTIONAL ATTRIBUTES:
  * instance_type (string)
      The type of instance to start. Updates to this field will trigger a stop/start of the EC2 instance.
  * availability_zone (string) (computed)
      The AZ where the instance will be created.

BLOCKS:
  * network_interface (min: 0, max: 0)
      Customize network interfaces to be attached at instance boot time.
      ATTRIBUTES:
        - network_interface_id (string)
          ID of the network interface to attach.
        - device_index (number) (required)
          Integer index of the network interface attachment.

For full documentation, visit: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
```

### 6. Module Details

Retrieves detailed metadata for a Terraform module.

**Input:**

```json
{
  "namespace": "terraform-aws-modules",  // Required: Module namespace
  "module": "vpc",                       // Required: Module name
  "provider": "aws"                      // Required: Provider name
}
```

**Output:**

```json
{
  "content": [{
    "type": "text",
    "text": {
      "versions": ["5.0.0", "4.0.0", ...],
      "inputs": [
        {
          "name": "region",
          "description": "AWS region to deploy into.",
          "default": "us-east-1"
        },
        ...
      ],
      "outputs": [
        {
          "name": "vpc_id",
          "description": "ID of the VPC created."
        },
        ...
      ],
      "dependencies": []
    }
  }]
}
```

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

Example usage with environment variables:

```bash
# Set environment variables
export LOG_LEVEL="debug"
export REQUEST_TIMEOUT_MS="15000"

# Run the server
node dist/index.js
```

## Testing

See the [TESTS.md](TESTS.md) file for information about testing this project.
