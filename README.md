# Terraform Registry MCP Server

A Model Context Protocol (MCP) server that provides tools for interacting with the Terraform Registry API. This server enables AI agents to query provider information, resource details, module metadata, and generate example configurations.

## Installation

### Installing in Cursor

To install and use this MCP server in [Cursor](https://cursor.sh/):

1. Clone this repository:
   ```bash
   git clone https://github.com/thrashr888/terraform-mcp-server.git
   cd terraform-mcp-server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the package:
   ```bash
   npm run build
   ```

4. In Cursor, open Settings (⌘+,) and navigate to the "AI" tab.
   
5. Scroll down to "Model Context Protocol" section and click "Add MCP."
   
6. Enter the following:
   - Name: Terraform Registry MCP
   - Command: node /path/to/terraform-mcp-server/dist/index.js
   
7. Click "Add" and then "Save" to complete the installation.

8. Restart Cursor to ensure the MCP server is properly loaded.

### Installing in Claude Desktop

To install and use this MCP server in Claude Desktop:

1. Clone and set up the repository as described in the Cursor installation steps.

2. Open Claude Desktop and click on your profile picture in the top-right corner.

3. Select "Settings" from the dropdown menu.

4. Navigate to the "Advanced" tab.

5. Scroll down to "Model Context Protocol" section and click "Add MCP."

6. Enter the following:
   - Name: Terraform Registry MCP
   - Command: node /path/to/terraform-mcp-server/dist/index.js
   
7. Click "Add" and then "Save" to complete the installation.

8. Restart Claude Desktop to ensure the MCP server is properly loaded.

Alternatively, you can use `npx -y terraform-mcp-server` as a command.

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

The project includes a comprehensive test suite for all tools and server functionality:

```bash
# Install dependencies if you haven't already
npm install

# Run all tests
npm test

# Run tests with watch mode for development
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

Tests are located in the `tests/` directory and organized by component:

* `tests/server.test.ts` - Tests for core server functionality
* `tests/tools/*.test.ts` - Tests for individual tools

### Manual Testing Scripts

The repository includes several bash scripts for manually testing the MCP server:

1. `test.sh` - A comprehensive test script that tests all tools with colorized output
2. `test-simple.sh` - A simplified test script that doesn't rely on external dependencies
3. `test-tool.sh` - A flexible script for testing individual tools with custom parameters

To run these scripts:

```bash
# Make scripts executable
chmod +x *.sh

# Run full test suite
./test.sh

# Run simplified test suite
./test-simple.sh

# Test a specific tool with parameters
./test-tool.sh providerLookup "provider=aws" "namespace=hashicorp"
```

These scripts provide a quick way to verify the server is working correctly without having to set up a full client application.

## Development

The server is built using TypeScript and uses the MCP SDK for server implementation. It makes HTTP requests to the Terraform Registry API to fetch data.

To add new tools:

1. Define the input interface
2. Add the tool to the tools array with proper inputSchema
3. Implement the tool handler in the switch statement
4. Update this README with the new tool's documentation
5. Add test coverage for the new tool
