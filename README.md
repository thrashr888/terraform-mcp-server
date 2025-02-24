# Terraform Registry MCP Server

## Overview

The Terraform Registry MCP Server is a Model Context Protocol (MCP) server that connects AI models (via MCP) to the Terraform Registry. It allows an AI assistant to look up Terraform provider information, resource usage examples (with related resources), and recommend Terraform modules. The server uses the official MCP TypeScript SDK and communicates over standard input/output (stdio) for easy integration with AI platforms like Anthropic's Claude.

## Features

- **Provider Reference Lookup** – Given a Terraform provider (e.g., "hashicorp/aws" or "aws"), the server retrieves information such as the latest version and available versions from the public Terraform Registry API.
- **Resource Usage (with Related Resources)** – For a given provider resource (e.g., AWS EC2 instance resource "aws_instance"), the server fetches the resource's documentation (public endpoints only) to provide an example usage snippet and identifies related resources commonly used alongside it.
- **Module Recommendations** – Based on a search query or keyword (optionally filtered by a provider), the server uses the Terraform Registry API to find and recommend relevant Terraform modules (prioritizing verified modules).

All responses conform to the MCP response format, ensuring they can be directly used by AI models. Responses are structured as JSON with a content array containing text segments, per MCP standards.

## Installation & Setup

1. **Prerequisites**: Ensure you have Node.js 18+ and npm installed (Node 18+ is recommended for built-in fetch support).
2. **Install Package**: Install via npm:

   ```bash
   npm install terraform-mcp-server
   ```

3. **Install Dependencies**: If building from source:

   ```bash
   npm install @modelcontextprotocol/sdk
   ```

4. **Build/Compile**: If using TypeScript, either:
   - Compile to JavaScript: `npm run build`
   - Run directly with ts-node: `npx ts-node index.ts`

## API Endpoints (Tools)

The server exposes its functionality as MCP "tools". Each tool can be invoked via a CallToolRequest with a JSON payload:

### 1. Provider Reference Lookup (providerLookup)

Looks up a Terraform provider on the registry and returns basic reference info.

```json
{
  "type": "CallToolRequest",
  "params": {
    "tool": "providerLookup",
    "input": {
      "provider": "<provider name>",
      "namespace": "<namespace (optional, default 'hashicorp')>"
    }
  }
}
```

Sample Response:

```json
{
  "content": [
    {
      "type": "text",
      "text": "Provider hashicorp/aws: latest version is 5.80.0 (out of 100 versions)."
    }
  ]
}
```

### 2. Resource Usage (resourceUsage)

Retrieves example usage of a specific Terraform resource and lists related resources.

```json
{
  "type": "CallToolRequest",
  "params": {
    "tool": "resourceUsage",
    "input": {
      "provider": "<provider name or namespace/provider>",
      "resource": "<resource name identifier>"
    }
  }
}
```

Sample Response:

````json
{
  "content": [
    {
      "type": "text",
      "text": "Example usage for aws_instance:\n```\nresource \"aws_instance\" \"example\" {\n  ami           = data.aws_ami.ubuntu.id\n  instance_type = \"t3.micro\"\n  # ... other required arguments ...\n}\n```\nRelated resources: aws_vpc, aws_subnet"
    }
  ]
}
````

### 3. Module Recommendations (moduleRecommendations)

Searches for and recommends Terraform modules based on keywords.

```json
{
  "type": "CallToolRequest",
  "params": {
    "tool": "moduleRecommendations",
    "input": {
      "query": "<search keywords>",
      "provider": "<provider filter (optional)>"
    }
  }
}
```

Sample Response:

```json
{
  "content": [
    {
      "type": "text",
      "text": "Recommended modules for \"vpc\":\n1. terraform-aws-modules/vpc/aws - AWS VPC management module.\n2. user/network/aws - AWS network module for VPC and subnets.\n3. Azure/network/azurerm - Azure network module for virtual networks."
    }
  ]
}
```

## Usage with Claude Desktop

Add this to your `claude_desktop_config.json`:

### Docker

Note: all directories must be mounted to `/projects` by default.

```json
{
  "mcpServers": {
    "terraform-registry": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "--mount",
        "type=bind,src=/Users/username/Desktop,dst=/projects/Desktop",
        "--mount",
        "type=bind,src=/path/to/other/allowed/dir,dst=/projects/other/allowed/dir,ro",
        "--mount",
        "type=bind,src=/path/to/file.txt,dst=/projects/path/to/file.txt",
        "mcp/terraform-registry"
      ]
    }
  }
}
```

### NPX

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

## Docker Deployment

Build the Docker image:

```bash
docker build -t terraform-mcp-server .
```

Run the container:

```bash
# Detached mode
docker run -d --name terraform_mcp terraform-mcp-server

# Interactive mode (for debugging)
docker run -it terraform-mcp-server
```

## Logging & Debugging

The server implements basic logging for troubleshooting. Each incoming request and response are logged to stderr, appearing in the console or Docker container logs without interfering with the STDOUT communication channel used by MCP.

## License

This project is licensed under the MIT License. See the LICENSE file for details.
