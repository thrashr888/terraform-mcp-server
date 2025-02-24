# Terraform Registry MCP Server

A Model Context Protocol (MCP) server that provides tools for interacting with the Terraform Registry API. This server enables AI agents to query provider information, resource details, module metadata, and generate example configurations.

## Tools

### 1. Provider Lookup

Looks up Terraform provider details by name, returning the latest version and version count.

**Input:**

```json
{
  "provider": "aws",
  "namespace": "hashicorp"
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
  "provider": "aws",
  "resource": "aws_instance"
}
```

**Output:**

````json
{
  "content": [
    {
      "type": "text",
      "text": "Example usage for aws_instance:\n```terraform\n[example code]\n```\nRelated resources: aws_vpc, aws_subnet"
    }
  ]
}
````

### 3. Module Recommendations

Searches for and recommends Terraform modules based on a query.

**Input:**

```json
{
  "query": "vpc",
  "provider": "aws"
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
  "provider": "aws",
  "namespace": "hashicorp"
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
  "provider": "aws",
  "namespace": "hashicorp"
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
  "provider": "aws",
  "namespace": "hashicorp",
  "resource": "aws_instance"
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
  "namespace": "terraform-aws-modules",
  "module": "vpc",
  "provider": "aws"
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
  "provider": "aws",
  "namespace": "hashicorp",
  "resource": "aws_instance"
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

## Development

The server is built using TypeScript and uses the MCP SDK for server implementation. It makes HTTP requests to the Terraform Registry API to fetch data.

To add new tools:

1. Define the input interface
2. Add the tool to the tools array
3. Implement the tool handler in the switch statement
4. Update this README with the new tool's documentation
