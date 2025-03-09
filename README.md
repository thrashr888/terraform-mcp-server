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
  "status": "success",
  "content": "Provider hashicorp/aws: latest version is 5.31.0 (out of 150 versions).",
  "metadata": {
    "provider": "aws",
    "namespace": "hashicorp",
    "version": "5.31.0",
    "versionCount": 150
  }
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
  "status": "success",
  "content": "# Resource: aws_instance\n\n## Example Usage\n\n```hcl\nresource \"aws_instance\" \"web\" {\n  ami           = \"ami-a1b2c3d4\"\n  instance_type = \"t3.micro\"\n\n  tags = {\n    Name = \"HelloWorld\"\n  }\n}\n```\n\n## Related Resources\n- aws_vpc\n- aws_subnet\n- aws_security_group",
  "metadata": {
    "provider": "aws",
    "resource": "aws_instance",
    "relatedResources": ["aws_vpc", "aws_subnet", "aws_security_group"]
  }
}
```

### 3. Module Recommendations

Searches for and recommends Terraform modules based on a query.

**Input:**

```json
{
  "query": "vpc",                // Required: Search query
  "provider": "aws"             // Optional: Filter modules by provider
}
```

**Output:**

```json
{
  "status": "success",
  "content": "# Recommended Modules for \"vpc\"\n\n1. terraform-aws-modules/vpc/aws (★3.2k)\n   AWS VPC Terraform module\n   Latest: v5.5.0\n\n2. terraform-aws-modules/vpc-peering/aws (★280)\n   VPC Peering module for AWS\n   Latest: v3.3.0\n\n3. cloudposse/vpc/aws (★180)\n   Terraform Module to Provision a VPC with Internet Gateway\n   Latest: v2.1.0",
  "metadata": {
    "query": "vpc",
    "provider": "aws",
    "totalResults": 3,
    "searchScore": 0.95
  }
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

### 7. Function Details

Gets details about a Terraform provider function.

**Input:**

```json
{
  "provider": "aws",             // Required: Provider name
  "function": "cidrhost",        // Required: Function name
  "namespace": "hashicorp"       // Optional: Provider namespace (defaults to "hashicorp")
}
```

**Output:**

```json
{
  "status": "success",
  "content": "# Function: cidrhost\n\nThis function is provided by the **hashicorp/aws** provider.\n\n## Description\ncidrhost calculates a full host IP address for a given host number within a given IP network address prefix.\n\n## Signature\n```text\ncidrhost(prefix, hostnum)\n```\n\n## Example Usage\n```hcl\nresource \"aws_instance\" \"web\" {\n  private_ip = cidrhost(aws_vpc.main.cidr_block, 5)\n}\n```\n\n## Arguments\n* prefix (string) - CIDR range in prefix notation (e.g. 10.0.0.0/16)\n* hostnum (number) - Whole number that can be represented as a binary integer with no more than the number of digits remaining in the address after the prefix.",
  "metadata": {
    "provider": "aws",
    "namespace": "hashicorp",
    "function": {
      "name": "cidrhost",
      "hasExample": true,
      "hasSignature": true,
      "hasArguments": true
    }
  }
}
```

### 8. Provider Guides

List and view provider-specific guides, including version upgrades and feature guides.

**Input:**

```json
{
  "provider": "aws",             // Required: Provider name
  "search": "upgrade",           // Optional: Search term to filter guides
  "guide": "version-5-upgrade"   // Optional: Specific guide to fetch
}
```

**Output:**

```json
{
  "status": "success",
  "content": "# hashicorp/aws Provider Guides\n\nSearch results for: \"upgrade\"\n\n## Available Guides\n\n- [Terraform AWS Provider Version 2 Upgrade Guide]\n- [Terraform AWS Provider Version 3 Upgrade Guide]\n- [Terraform AWS Provider Version 4 Upgrade Guide]\n- [Terraform AWS Provider Version 5 Upgrade Guide]\n\n## Version Upgrade Guides\n\n- [Terraform AWS Provider Version 2 Upgrade Guide]\n- [Terraform AWS Provider Version 3 Upgrade Guide]\n- [Terraform AWS Provider Version 4 Upgrade Guide]\n- [Terraform AWS Provider Version 5 Upgrade Guide]",
  "metadata": {
    "provider": "aws",
    "namespace": "hashicorp",
    "summary": {
      "total": 4,
      "upgradeGuides": 4,
      "featureGuides": 0
    }
  }
}
```

### 9. Policy Search

Search for policy libraries in the Terraform Registry.

**Input:**

```json
{
  "query": "aws security",       // Required: Search query for finding policy libraries
  "provider": "aws"             // Optional: Filter policies by provider
}
```

**Output:**

```json
{
  "status": "success",
  "content": "## Policy Library Results for \"aws security\"\n\n### 1. hashicorp/CIS-Policy-Set-for-AWS-VPC-Terraform\n\n**Description**: AWS VPC CIS Policy Set for Terraform\n**Provider**: aws\n**Downloads**: 17,869\n**Latest Version**: 1.0.3\n**Published**: 2/11/2024\n\n### 2. hashicorp/CIS-Policy-Set-for-AWS-S3-Terraform\n\n**Description**: AWS S3 CIS Policy Set for Terraform\n**Provider**: aws\n**Downloads**: 119,861\n**Latest Version**: 1.0.3\n**Published**: 2/11/2024",
  "metadata": {
    "results": [
      {
        "id": "118",
        "name": "CIS-Policy-Set-for-AWS-VPC-Terraform",
        "namespace": "hashicorp",
        "providers": [{"name": "aws"}],
        "downloads": 17869,
        "latest_version": "1.0.3"
      }
    ]
  }
}
```

### 10. Policy Details

Get detailed information about a specific policy library including its latest version.

**Input:**

```json
{
  "namespace": "Great-Stone",    // Required: Policy library namespace
  "name": "vault-aws-secret-type" // Required: Policy library name
}
```

**Output:**

```json
{
  "status": "success",
  "content": "# Policy: Great-Stone/vault-aws-secret-type\n\n**Title**: AWS Secrets Role Type Check\n**Owner**: Great-Stone\n**Downloads**: 0\n**Latest Version**: 1.0.0\n**Published**: 9/4/2024\n**Categories**: Utility\n**Providers**: vault\n\n## Documentation\n\n### Sentinel Example\n\n```hcl\nimport \"tfplan/v2\" as tfplan\n\nallow_types = [\"assumed_role\", \"iam_user\", \"federation_token\"]\n\naws_secret_roles = filter tfplan.resource_changes as _, rc {\n    rc.type is \"vault_aws_secret_backend_role\" and\n    rc.mode is \"managed\" and\n    (rc.change.actions contains \"create\" or rc.change.actions contains \"update\")\n}\n\nviolations = 0\nfor aws_secret_roles as _, role {\n    if role.change.after.credential_type not in allow_types {\n        print(\"Error specifying AWS Secret Role type\")\n        violations = violations + 1\n    }\n}\n\nmain = rule {\n    violations is 0\n}\n```\n\n### Terraform Sample\n\n```hcl\nresource \"vault_aws_secret_backend_role\" \"role\" {\n  credential_type = \"iam_user\"\n  policy_document = jsonencode({\n    Version = \"2012-10-17\"\n    Statement = [\n      {\n        Effect = \"Allow\"\n        Action = [\"*\"]\n        Resource = [\"*\"]\n      }\n    ]\n  })\n}\n```",
  "metadata": {
    "namespace": "Great-Stone",
    "name": "vault-aws-secret-type",
    "latest_version": "1.0.0",
    "downloads": 0,
    "verified": false,
    "providers": ["vault"]
  }
}
```

### 11. Explorer Query

Query the Terraform Cloud Explorer API to analyze data across workspaces, providers, modules, and Terraform versions in an organization.

**Input:**

```json
{
  "organization": "my-org",      // Required: The name of the organization to query
  "type": "workspaces",          // Required: The type of view to query (workspaces, tf_versions, providers, modules)
  "sort": "-updated-at",         // Optional: Field to sort by (prefix with - for descending)
  "filter": [                    // Optional: Filters to apply
    {
      "field": "terraform-version",
      "operator": "==",
      "value": ["1.5.0"]
    }
  ],
  "fields": ["name", "resource-count"], // Optional: Specific fields to return
  "page_number": 1,              // Optional: Page number for pagination
  "page_size": 20                // Optional: Page size for pagination
}
```

**Output:**

```json
{
  "status": "success",
  "content": "## Explorer Query Results (2 total)\n\n| name | resource-count |\n| --- | --- |\n| production-vpc | 42 |\n| staging-vpc | 28 |",
  "data": {
    "results": [
      {
        "name": "production-vpc",
        "resource-count": 42
      },
      {
        "name": "staging-vpc",
        "resource-count": 28
      }
    ],
    "total": 2,
    "context": {
      "organization": "my-org",
      "type": "workspaces",
      "timestamp": "2024-03-09T00:15:00.000Z"
    }
  }
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
| `TFC_TOKEN` | Terraform Cloud API token for private registry access | |

Example usage with environment variables:

```bash
# Set environment variables
export LOG_LEVEL="debug"
export REQUEST_TIMEOUT_MS="15000"
export TFC_TOKEN="your-terraform-cloud-token"

# Run the server
node dist/index.js
```

## Testing

See the [TESTS.md](TESTS.md) file for information about testing this project.
