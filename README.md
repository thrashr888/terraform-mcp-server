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

## Tools

### 1. Provider Lookup

Looks up Terraform provider details by name, returning the latest version and version count.

**Input:**

```json
{
  "provider": "aws",             // Optional: Provider name
  "namespace": "hashicorp",      // Optional: Provider namespace (defaults to "hashicorp")
  "name": "aws"                  // Optional: Alternative field for provider name
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
  "provider": "aws",             // Optional: Provider name
  "resource": "aws_instance",    // Optional: Resource name
  "name": "aws_instance"         // Optional: Alternative field for resource name
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
  "query": "vpc",                // Optional: Search query
  "keyword": "vpc",              // Optional: Alternative field for search query
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

### 5. Provider Schema Details

Retrieves full schema details of a provider, including resource and data source schemas.

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
      "provider_schema": {
        "provider_schemas": { ... },
        "resource_schemas": { ... },
        "data_source_schemas": { ... }
      }
    }
  }]
}
```

### 6. Resource Argument Details

Fetches details about a specific resource type's arguments.

**Input:**

```json
{
  "provider": "aws",             // Required: Provider name
  "namespace": "hashicorp",      // Required: Provider namespace
  "resource": "aws_instance"     // Required: Resource name
}
```

**Output:**

```json
{
  "content": [{
    "type": "text",
    "text": {
      "arguments": [
        {
          "name": "ami",
          "type": "string",
          "description": "AMI ID to use for the instance.",
          "required": true
        },
        ...
      ]
    }
  }]
}
```

### 7. Module Details

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

### 8. Example Configuration Generator

Generates a minimal Terraform configuration for a given provider and resource.

**Input:**

```json
{
  "provider": "aws",             // Required: Provider name
  "namespace": "hashicorp",      // Required: Provider namespace
  "resource": "aws_instance"     // Required: Resource name
}
```

**Output:**

```json
{
  "content": [
    {
      "type": "text",
      "text": {
        "example_configuration": "resource \"aws_instance\" \"example\" {\n  ami = \"example\"\n  instance_type = \"example\"\n}\n"
      }
    }
  ]
}
```

## Running the Server

The server runs using stdio transport for MCP communication:

```bash
npm install
npm start
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
- `tests/server.test.ts` - Tests for core server functionality
- `tests/tools/*.test.ts` - Tests for individual tools

## Development

The server is built using TypeScript and uses the MCP SDK for server implementation. It makes HTTP requests to the Terraform Registry API to fetch data.

To add new tools:

1. Define the input interface
2. Add the tool to the tools array with proper inputSchema
3. Implement the tool handler in the switch statement
4. Update this README with the new tool's documentation
5. Add test coverage for the new tool
