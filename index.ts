#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequest,
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
  InitializeRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Add a type definition for handleRequest which isn't directly exposed in types
declare module "@modelcontextprotocol/sdk/server/index.js" {
  interface Server {
    handleRequest(schema: any, request: any): Promise<any>;
  }
}

// ----------------- Interfaces for Input -----------------
export interface ProviderLookupInput {
  namespace?: string;
  provider: string;
  version?: string;
  name?: string;       // fallback key if user uses { name: "aws" } etc.
}

interface ResourceUsageInput {
  provider?: string;   // e.g. "aws"
  resource?: string;   // e.g. "aws_instance"
  name?: string;       // fallback
}

interface ModuleRecommendationsInput {
  query?: string;      // e.g. "vpc"
  keyword?: string;    // fallback
  provider?: string;   // e.g. "aws"
}

interface DataSourceLookupInput {
  provider: string;    // e.g. "aws"
  namespace: string;   // e.g. "hashicorp"
}

interface ResourceArgumentDetailsInput {
  provider: string;    // e.g. "aws"
  namespace: string;   // e.g. "hashicorp"
  resource: string;    // e.g. "aws_instance"
}

interface ModuleDetailsInput {
  namespace: string;   // e.g. "terraform-aws-modules"
  module: string;      // e.g. "vpc"
  provider: string;    // e.g. "aws"
}

// ----------------- Schema Types -----------------
interface SchemaAttribute {
  type: string | object;
  description?: string;
  required?: boolean;
  computed?: boolean;
}

interface ResourceSchema {
  block?: {
    attributes?: Record<string, SchemaAttribute>;
    block_types?: Record<string, BlockType>;
  };
}

interface BlockType {
  description?: string;
  nesting_mode?: string;
  min_items?: number;
  max_items?: number;
  block?: {
    attributes?: Record<string, SchemaAttribute>;
  };
}

// --------------------------------------------------------

// Current package version from package.json
const VERSION = "0.9.7";

// Helper function to create standardized response format
function createStandardResponse(
  status: "success" | "error", 
  content: string, 
  metadata: Record<string, any> = {}
) {
  return { 
    content: [{ 
      type: "text", 
      text: JSON.stringify({
        status,
        content,
        metadata,
        timestamp: new Date().toISOString(),
        version: VERSION
      }, null, 2)
    }]
  };
}

// Helper function to format code examples as markdown
function formatAsMarkdown(code: string, language = "terraform") {
  return `\`\`\`${language}\n${code}\n\`\`\``;
}

// Helper function to sanitize and format URLs
function formatUrl(url: string) {
  // Ensure URL is properly encoded and formatted
  try {
    // Create URL object to validate and normalize
    const urlObj = new URL(url);
    return urlObj.toString();
  } catch (e) {
    // If URL parsing fails, return the original
    return url;
  }
}

// Helper function to add context information to responses
function addContextInfo(metadata: Record<string, any>, contextType: string, contextInfo: Record<string, any>) {
  if (!metadata.context) {
    metadata.context = {};
  }
  metadata.context[contextType] = contextInfo;
  return metadata;
}

// Helper function to generate example values based on Terraform input types
function getExampleValue(input: any): string {
  const type = input.type || "string";
  
  // Simple type handling
  if (type === "string") return `"example-value"`;
  if (type === "number") return "123";
  if (type === "bool") return "true";
  
  // Complex types
  if (type.startsWith("map(")) return "{}";
  if (type.startsWith("list(")) return "[]";
  if (type.startsWith("set(")) return "[]";
  if (type === "any") return "null";
  
  // Default for unknown types
  return `"${input.name}-value"`;
}

// Helper function to generate resource descriptions
function getResourceDescription(resourceName: string, providerName: string): string {
  // Extract the resource type
  const resourceType = resourceName.includes('_') ? 
    resourceName.substring(resourceName.indexOf('_') + 1) : 
    resourceName;
  
  // Common resource descriptions
  const descriptions: Record<string, string> = {
    // AWS common resources
    's3_bucket': 'An S3 bucket is a container for storing objects in Amazon S3. You can use buckets to store and serve files, host static websites, or as a destination for logs.',
    'instance': 'An EC2 instance is a virtual server in Amazon\'s Elastic Compute Cloud (EC2) for running applications on the AWS infrastructure.',
    'vpc': 'A Virtual Private Cloud (VPC) is a virtual network dedicated to your AWS account that is logically isolated from other virtual networks in the AWS Cloud.',
    'subnet': 'A subnet is a range of IP addresses in your VPC that can be used to isolate resources within your network.',
    'security_group': 'A security group acts as a virtual firewall for your instance to control inbound and outbound traffic.',
    'iam_role': 'An IAM role is an AWS Identity and Access Management entity with permissions to make AWS service requests.',
    'lambda_function': 'AWS Lambda is a serverless compute service that runs your code in response to events and automatically manages the underlying compute resources.',
    
    // GCP common resources
    'compute_instance': 'A Compute Engine instance is a virtual machine hosted on Google\'s infrastructure.',
    
    // Azure common resources
    'resource_group': 'A resource group is a container that holds related resources for an Azure solution.',
    'virtual_machine': 'An Azure virtual machine is an on-demand, scalable computing resource.',
  };
  
  // Check for specific resource types
  for (const [key, description] of Object.entries(descriptions)) {
    if (resourceType.includes(key)) {
      return description;
    }
  }
  
  // Default description if no specific match found
  return `A ${resourceName} resource for the ${providerName} provider. Please refer to the provider documentation for more details about this resource type.`;
}

// Helper function to generate example template based on resource type
function generateTemplateExample(resourceName: string, providerName: string): string {
  // Extract the resource type to generate appropriate examples
  const resourceType = resourceName.includes('_') ? 
    resourceName.substring(resourceName.indexOf('_') + 1) : 
    resourceName;
  
  // Common patterns for different resource types
  const commonPatterns: Record<string, string> = {
    // AWS common resources
    's3_bucket': `resource "${resourceName}" "example" {
  bucket = "my-example-bucket-name"
  acl    = "private"
  
  tags = {
    Name        = "My Example Bucket"
    Environment = "Dev"
  }
}`,
    'instance': `resource "${resourceName}" "example" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t2.micro"
  
  tags = {
    Name = "ExampleInstance"
  }
}`,
    'vpc': `resource "${resourceName}" "example" {
  cidr_block = "10.0.0.0/16"
  
  tags = {
    Name = "example-vpc"
  }
}`,
    'subnet': `resource "${resourceName}" "example" {
  vpc_id            = aws_vpc.example.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "us-west-2a"
  
  tags = {
    Name = "example-subnet"
  }
}`,
    'security_group': `resource "${resourceName}" "example" {
  name        = "example-security-group"
  description = "Example security group"
  vpc_id      = aws_vpc.example.id
  
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}`,
    'iam_role': `resource "${resourceName}" "example" {
  name = "example-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}`,
    'lambda_function': `resource "${resourceName}" "example" {
  function_name = "example-function"
  role          = aws_iam_role.example.arn
  handler       = "index.handler"
  runtime       = "nodejs14.x"
  
  filename      = "function.zip"
  
  environment {
    variables = {
      ENVIRONMENT = "dev"
    }
  }
}`,

    // GCP common resources
    'compute_instance': `resource "${resourceName}" "example" {
  name         = "example-instance"
  machine_type = "e2-medium"
  zone         = "us-central1-a"
  
  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-10"
    }
  }
  
  network_interface {
    network = "default"
    access_config {
      // Ephemeral IP
    }
  }
}`,

    // Azure common resources
    'resource_group': `resource "${resourceName}" "example" {
  name     = "example-resources"
  location = "West Europe"
  
  tags = {
    environment = "dev"
  }
}`,
    'virtual_machine': `resource "${resourceName}" "example" {
  name                  = "example-vm"
  location              = azurerm_resource_group.example.location
  resource_group_name   = azurerm_resource_group.example.name
  network_interface_ids = [azurerm_network_interface.example.id]
  vm_size               = "Standard_DS1_v2"
  
  storage_image_reference {
    publisher = "Canonical"
    offer     = "UbuntuServer"
    sku       = "18.04-LTS"
    version   = "latest"
  }
}`,
  };
  
  // Check for specific resource types first
  for (const [key, template] of Object.entries(commonPatterns)) {
    if (resourceType.includes(key)) {
      return template;
    }
  }
  
  // Default template if no specific match found
  return `resource "${resourceName}" "example" {
  # Required arguments
  # Refer to the provider documentation for required and optional arguments
  
  # Common pattern includes tags for most resources
  tags = {
    Name        = "example-resource"
    Environment = "dev"
    Terraform   = "true"
  }
}`;
}

const tools: Tool[] = [
  {
    name: "providerLookup",
    description: "Lookup a Terraform provider by name and optionally version.",
    inputSchema: { 
      type: "object", 
      properties: {
        provider: { type: "string", description: "Provider name (e.g. 'aws')" },
        namespace: { type: "string", description: "Provider namespace (e.g. 'hashicorp')" },
        version: { type: "string", description: "Provider version (e.g. '4.0.0')" }
      },
      required: ["provider"]
    }
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
    name: "moduleRecommendations",
    description: "Search for and recommend Terraform modules for a given query.",
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
    name: "dataSourceLookup",
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
    description: "Fetches details about a specific resource type's arguments, including name, type, description, and requirements.",
    inputSchema: { 
      type: "object", 
      properties: {
        provider: { type: "string", description: "Provider name (e.g. 'aws')" },
        namespace: { type: "string", description: "Provider namespace (e.g. 'hashicorp')" },
        resource: { type: "string", description: "Resource name (e.g. 'aws_instance')" }
      },
      required: ["provider", "namespace", "resource"]
    }
  },
  {
    name: "moduleDetails",
    description: "Retrieves detailed metadata for a Terraform module including versions, inputs, outputs, and dependencies.",
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
];

const server = new Server(
  { name: "terraform-registry-mcp", version: VERSION },
  { capabilities: { tools: { listChanged: true } } }
);

// Add debug log for initialization
console.error("Server constructor created, setting up handlers...");

// Initialize handler
server.setRequestHandler(InitializeRequestSchema, async (request) => {
  console.error("Received Initialize request!");
  console.error(JSON.stringify(request, null, 2));
  return {
    serverInfo: { name: "terraform-registry-mcp", version: VERSION },
    capabilities: { tools: { listChanged: true } }
  };
});

// ListToolsRequest
server.setRequestHandler(ListToolsRequestSchema, async () => {
  console.error("Received ListToolsRequest");
  return { tools };
});

// CallToolRequest
server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
  console.error("Received CallToolRequest, beginning processing...");
  
  // Make sure we have valid params
  if (!request || !request.params) {
    console.error("Invalid request structure: missing params");
    return { content: [{ type: "text", text: "Error: Invalid request structure" }] };
  }
  
  // Enhanced detailed logging for debugging
  console.error("=== DETAILED REQUEST DEBUG INFO ===");
  console.error(`Request type: ${typeof request}`);
  console.error(`Complete request: ${JSON.stringify(request, null, 2)}`);
  console.error(`Params type: ${typeof request.params}`);
  console.error(`Params keys: ${Object.keys(request.params).join(", ")}`);
  console.error(`Params content: ${JSON.stringify(request.params, null, 2)}`);
  
  // Extract tool name and arguments, supporting both formats
  // Newer MCP protocol uses name/arguments, older uses tool/input
  const toolName = request.params.name || (request.params as any).tool;
  const arguments_ = request.params.arguments || (request.params as any).input || {};
  
  console.error(`Using tool name: ${toolName} (from ${request.params.name ? "name" : "tool"} property)`);
  console.error(`Using arguments: ${JSON.stringify(arguments_)} (from ${request.params.arguments ? "arguments" : "input"} property)`);
  
  if (!toolName) {
    console.error("Tool name is missing in the request");
    return { content: [{ type: "text", text: "Error: Tool name is missing in the request" }] };
  }
  
  console.error(`Received CallToolRequest for tool: ${toolName}, arguments: ${JSON.stringify(arguments_)}`);

  try {
    // Log the toolName to help with debugging
    console.error(`Processing tool request for: "${toolName}"`);
    
    switch (toolName) {
    case "providerLookup": {
      // Fetches information about a Terraform provider from the registry
      // - Gets the latest version and total version count
      // - Supports both namespace/provider and provider-only formats
      // - Defaults to hashicorp namespace if not specified
      const { provider, namespace, version } = arguments_ as unknown as ProviderLookupInput;
      let providerStr = provider || "";
      let namespaceStr = namespace || "hashicorp";

      if (providerStr.includes("/")) {
        const [ns, prov] = providerStr.split("/");
        namespaceStr = ns;
        providerStr = prov || "";
      }
      if (!providerStr) throw new Error("Provider name is required");

      const url = `https://registry.terraform.io/v1/providers/${namespaceStr}/${providerStr}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Provider not found: ${namespaceStr}/${providerStr}`);
      }
      const data = await res.json();
      const versions = data.versions || [];
      if (versions.length === 0) {
        throw new Error(`No versions found for provider: ${namespaceStr}/${providerStr}`);
      }
      const latestVersionObj = versions[versions.length - 1];
      const latestVersion = latestVersionObj.version || latestVersionObj;
      const totalVersions = versions.length;
      
      // Create a more informative markdown response
      const providerUrl = formatUrl(`https://registry.terraform.io/providers/${namespaceStr}/${providerStr}`);
      const markdownResponse = `## Provider: ${namespaceStr}/${providerStr}\n\n` +
        `**Latest Version**: ${latestVersion}\n\n` +
        `**Total Versions**: ${totalVersions}\n\n` +
        `### Usage Example\n\n` +
        formatAsMarkdown(`terraform {
  required_providers {
    ${providerStr} = {
      source = "${namespaceStr}/${providerStr}"
      version = ">= ${latestVersion}"
    }
  }
}

provider "${providerStr}" {
  # Configuration options
}`) +
        `\n\n**[View Documentation](${providerUrl})**`;

      console.error(`Response (providerLookup): Found provider ${namespaceStr}/${providerStr} with ${totalVersions} versions`);
      
      // Add metadata with context
      const metadata: Record<string, any> = {
        namespace: namespaceStr,
        provider: providerStr,
        latestVersion,
        totalVersions,
        documentationUrl: providerUrl
      };
      
      // Add recent versions to metadata
      if (versions.length > 0) {
        metadata.recentVersions = versions.slice(-5).map((v: any) => v.version || v).reverse();
      }
      
      // Add compatibility information
      addContextInfo(metadata, "compatibility", {
        terraformCoreVersions: "Terraform 0.12 and later",
        lastUpdated: new Date().toISOString()
      });
      
      return createStandardResponse("success", markdownResponse, metadata);
    }

    case "resourceUsage": {
      return await handleResourceUsage(toolName, arguments_);
    }

    case "moduleRecommendations": {
      // Searches for and recommends verified Terraform modules
      // - Searches based on keyword/query and optional provider filter
      // - Returns top 3 verified modules matching the search criteria
      // - Includes module descriptions and provider information
      const { query, keyword, provider } = arguments_ as unknown as ModuleRecommendationsInput;
      const searchStr = query || keyword || "";
      if (!searchStr) {
        throw new Error("Search query is required for module recommendations.");
      }
      const providerFilter = provider || "";
      let searchUrl = `https://registry.terraform.io/v1/modules/search?q=${encodeURIComponent(
        searchStr
      )}&limit=3&verified=true`;
      if (providerFilter) {
        searchUrl += `&provider=${encodeURIComponent(providerFilter)}`;
      }
      const res = await fetch(searchUrl);
      if (!res.ok) {
        throw new Error("Module search failed.");
      }
      const resultData = await res.json();
      const modules = resultData.modules || [];
      if (modules.length === 0) {
        const text = `No modules found for "${searchStr}".`;
        console.error(`Response (moduleRecommendations): ${text}`);
        return createStandardResponse("error", text, { query: searchStr, provider: providerFilter });
      }
      
      // Construct a better formatted response with structured module information
      let markdownResponse = `## Recommended modules for "${searchStr}"\n\n`;
      
      // Process each module and create a structured format
      const formattedModules = modules.map((mod: any, index: number) => {
        const name = `${mod.namespace}/${mod.name}`;
        const prov = mod.provider;
        const description = mod.description || "";
        const usageExample = `module "${mod.name}" {
  source = "${name}/${prov}"
  version = "${mod.version || "latest"}"
  
  # Required inputs go here
}`;

        // Add to markdown response
        markdownResponse += `### ${index + 1}. ${name}/${prov}\n\n`;
        markdownResponse += `**Description**: ${description}\n\n`;
        markdownResponse += `**Provider**: ${prov}\n\n`;
        markdownResponse += `**Example Usage**:\n\n`;
        markdownResponse += formatAsMarkdown(usageExample);
        markdownResponse += `\n\n`;
        
        // Also return structured data for each module
        return {
          name: name,
          provider: prov,
          description: description,
          url: formatUrl(`https://registry.terraform.io/modules/${name}/${prov}`),
          latestVersion: mod.version || "latest",
        };
      });
      
      console.error(
        `Response (moduleRecommendations): Found ${modules.length} modules for "${searchStr}"`
      );
      
      // Add contextual information about the search
      const metadata = {
        query: searchStr,
        provider: providerFilter,
        resultCount: modules.length,
        modules: formattedModules
      };
      
      // Add contextual information about Terraform compatibility
      addContextInfo(metadata, "compatibility", {
        terraformCoreVersions: "Terraform 0.12 and later",
        lastUpdated: new Date().toISOString()
      });
      
      return createStandardResponse("success", markdownResponse, metadata);
    }

    case "dataSourceLookup": {
      // Lists all available data sources for a specific provider
      // - Returns link to provider's data sources documentation
      // - Requires both namespace and provider name
      const { provider, namespace } = arguments_ as unknown as DataSourceLookupInput;
      if (!provider || !namespace) {
        throw new Error("Both provider and namespace are required.");
      }

      console.error(`Returning documentation link for ${namespace}/${provider} data sources`);
      
      // Direct to documentation approach - the most reliable method
      const docUrl = formatUrl(`https://registry.terraform.io/providers/${namespace}/${provider}/latest/docs/data-sources`);
      
      // Create a markdown formatted response
      const markdownResponse = `## Data Sources for Provider ${namespace}/${provider}\n\n` +
        `Data sources allow Terraform to use information defined outside of Terraform, defined by another separate Terraform configuration, or modified by functions.\n\n` +
        `### Usage Example\n\n` +
        formatAsMarkdown(`data "<data_source_name>" "example" {
  # Required arguments go here
  # ...
}

# Reference the data source
output "example_output" {
  value = data.<data_source_name>.example.<attribute>
}`) + 
        `\n\n**[View All Data Sources Documentation](${docUrl})**`;
      
      // Add metadata with context
      const metadata = {
        provider,
        namespace,
        documentationUrl: docUrl
      };
      
      // Add compatibility information
      addContextInfo(metadata, "compatibility", {
        terraformCoreVersions: "Terraform 0.12 and later",
        lastUpdated: new Date().toISOString()
      });
      
      return createStandardResponse("success", markdownResponse, metadata);
    }

    case "resourceArgumentDetails": {
      // Fetches detailed information about a specific resource's arguments
      // - Links directly to resource documentation
      // - Helps understand how to configure a specific resource
      // - Requires provider, namespace, and resource name
      const { provider, namespace, resource } = arguments_ as unknown as ResourceArgumentDetailsInput;
      if (!provider || !namespace || !resource) {
        throw new Error("Provider, namespace, and resource are required.");
      }

      console.error(`Returning documentation link for ${namespace}/${provider}/resources/${resource}`);
      
      // Direct to documentation approach - the most reliable method
      const docUrl = formatUrl(`https://registry.terraform.io/providers/${namespace}/${provider}/latest/docs/resources/${resource}`);
      
      // Create a more structured and informative response
      const markdownResponse = `## Resource: ${resource}\n\n` +
        `This resource is provided by the **${namespace}/${provider}** provider.\n\n` +
        `### Usage\n\n` +
        `For detailed information on this resource's arguments and attributes, please refer to the official documentation:\n\n` +
        `**[View Full Documentation](${docUrl})**\n\n` +
        `### Example Usage Pattern\n\n` +
        formatAsMarkdown(`resource "${resource}" "example" {
  # Required arguments go here
  # ...
}`);
      
      // Add metadata for context
      const metadata = {
        resource,
        provider,
        namespace,
        documentationUrl: docUrl
      };
      
      // Add context about Terraform compatibility
      addContextInfo(metadata, "compatibility", {
        terraformCoreVersions: "Terraform 0.12 and later",
        lastUpdated: new Date().toISOString()
      });
      
      return createStandardResponse("success", markdownResponse, metadata);
    }

    case "moduleDetails": {
      // Retrieves comprehensive details about a specific Terraform module
      // - Gets versions, inputs, outputs, and dependencies
      // - Provides complete module metadata for integration
      // - Requires namespace, module name, and provider
      const { namespace, module, provider } = arguments_ as unknown as ModuleDetailsInput;
      if (!namespace || !module || !provider) {
        throw new Error("Namespace, module, and provider are required.");
      }

      const url = `https://registry.terraform.io/v1/modules/${namespace}/${module}/${provider}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch module details: ${response.status} ${response.statusText}`);
      }

      const moduleData = await response.json();
      const versions = moduleData.versions || [];
      const root = moduleData.root || {};
      const inputs = root.inputs || [];
      const outputs = root.outputs || [];
      const dependencies = root.dependencies || [];

      // Create a summary markdown response that's more readable
      let markdownResponse = `## Module: ${namespace}/${module}/${provider}\n\n`;
      
      // Include latest version and published date
      markdownResponse += `**Latest Version**: ${versions[0] || "unknown"}\n\n`;
      
      // Add module description if available
      if (moduleData.description) {
        markdownResponse += `**Description**: ${moduleData.description}\n\n`;
      }
      
      // Add usage example
      const usageExample = `module "${module}" {
  source = "${namespace}/${module}/${provider}"
  version = "${versions[0] || "latest"}"
  
  # Required inputs
${inputs
  .filter((input: any) => input.required)
  .map((input: any) => `  ${input.name} = ${getExampleValue(input)}`)
  .join('\n')}
}`;

      markdownResponse += `**Example Usage**:\n\n${formatAsMarkdown(usageExample)}\n\n`;
      
      // Add a summary of required inputs
      if (inputs.length > 0) {
        markdownResponse += `### Required Inputs\n\n`;
        const requiredInputs = inputs.filter((input: any) => input.required);
        
        if (requiredInputs.length > 0) {
          requiredInputs.forEach((input: any) => {
            markdownResponse += `- **${input.name}** (${input.type}): ${input.description || 'No description available'}\n`;
          });
        } else {
          markdownResponse += `*No required inputs*\n`;
        }
        markdownResponse += `\n`;
      }
      
      // Add a summary of key outputs
      if (outputs.length > 0) {
        markdownResponse += `### Key Outputs\n\n`;
        // Limit to 5 most important outputs to avoid overwhelming information
        const keyOutputs = outputs.slice(0, 5);
        keyOutputs.forEach((output: any) => {
          markdownResponse += `- **${output.name}**: ${output.description || 'No description available'}\n`;
        });
        if (outputs.length > 5) {
          markdownResponse += `\n*... and ${outputs.length - 5} more outputs*\n`;
        }
        markdownResponse += `\n`;
      }
      
      // Include documentation URL
      const docsUrl = formatUrl(`https://registry.terraform.io/modules/${namespace}/${module}/${provider}`);
      markdownResponse += `**[View Full Documentation](${docsUrl})**\n`;

      console.error(`Response (moduleDetails): Retrieved details for ${namespace}/${module}/${provider}`);
      
      // Create metadata with structured information
      const metadata = {
        moduleId: `${namespace}/${module}/${provider}`,
        latestVersion: versions[0] || "unknown",
        allVersions: versions.slice(0, 5), // Show only the most recent 5 versions
        totalVersions: versions.length,
        inputCount: inputs.length,
        outputCount: outputs.length,
        dependencies,
        documentationUrl: docsUrl
      };
      
      // Add compatibility information
      addContextInfo(metadata, "compatibility", {
        terraformCoreVersions: "Terraform 0.12 and later",
        lastUpdated: new Date().toISOString()
      });
      
      return createStandardResponse("success", markdownResponse, metadata);
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`);
    }
  } catch (error) {
    console.error(`Error in tool handler for ${toolName}:`, error);
    throw error;
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`terraform-registry-mcp v${VERSION} is running (stdio)...`);

// Helper function to fetch documentation content from the Terraform Registry API
async function fetchDocumentation(provider: string, resource: string): Promise<{content: string; docId: string} | null> {
  try {
    // First, find the document ID by querying with filters
    const filterUrl = `https://registry.terraform.io/v2/provider-docs?filter%5Bcategory%5D=resources&filter%5Bslug%5D=${resource}&filter%5Blanguage%5D=hcl&page%5Bsize%5D=1`;
    
    console.log(`Fetching document ID from: ${filterUrl}`);
    const filterResponse = await fetch(filterUrl);
    
    if (!filterResponse.ok) {
      console.error(`Failed to fetch document ID: ${filterResponse.status} ${filterResponse.statusText}`);
      return null;
    }
    
    const filterData = await filterResponse.json();
    
    if (!filterData.data || filterData.data.length === 0) {
      console.error(`No documentation found for resource: ${resource}`);
      return null;
    }
    
    const docId = filterData.data[0].id;
    
    // Now fetch the full documentation using the document ID
    const docUrl = `https://registry.terraform.io/v2/provider-docs/${docId}`;
    
    console.log(`Fetching documentation content from: ${docUrl}`);
    const docResponse = await fetch(docUrl);
    
    if (!docResponse.ok) {
      console.error(`Failed to fetch documentation content: ${docResponse.status} ${docResponse.statusText}`);
      return null;
    }
    
    const docData = await docResponse.json();
    
    if (!docData.data || !docData.data.attributes || !docData.data.attributes.content) {
      console.error(`Documentation content not found for resource: ${resource}`);
      return null;
    }
    
    return {
      content: docData.data.attributes.content,
      docId: docId
    };
  } catch (error) {
    console.error(`Error fetching documentation: ${error}`);
    return null;
  }
}

// Helper function to extract example usage from documentation content
function extractUsageFromApiContent(content: string): string {
  try {
    // Look for the Example Usage section and extract the code
    const exampleMatch = content.match(/## Example Usage(.*?)##/s);
    
    if (exampleMatch && exampleMatch[1]) {
      // Find the code block in the example usage section
      const codeMatch = exampleMatch[1].match(/```(?:terraform|hcl)(.*?)```/s);
      
      if (codeMatch && codeMatch[1]) {
        // Return the cleaned code block
        return codeMatch[1].trim();
      }
    }
    
    return '';
  } catch (error) {
    console.error(`Error extracting usage from API content: ${error}`);
    return '';
  }
}

// Helper function to fetch data from a URL
async function fetchData(url: string, options: RequestInit = {}): Promise<any> {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching data from ${url}: ${error}`);
    throw error;
  }
}

// Helper function for resourceUsage
async function handleResourceUsage(toolName: string, parameters: any) {
  // Extract resource parameters, handling either { provider, resource } or { name } format
  const resourceParams: ResourceUsageInput = {
    provider: parameters.provider,
    resource: parameters.resource || parameters.name,
  };

  // Validate required parameters
  if (!resourceParams.provider) {
    throw new Error('Provider parameter is required for resourceUsage');
  }
  if (!resourceParams.resource) {
    throw new Error('Resource parameter is required for resourceUsage');
  }

  // Try to get provider version info
  let latestVersion = '';
  try {
    const providerUrl = `https://registry.terraform.io/v1/providers/${resourceParams.provider}`;
    const providerData = await fetchData(providerUrl);
    latestVersion = providerData.version;
  } catch (error) {
    console.error(`Error fetching provider info: ${error}`);
  }

  // URL for the documentation
  const url = `https://registry.terraform.io/providers/${resourceParams.provider}/latest/docs/resources/${resourceParams.resource}`;
  const headers = { Accept: 'application/json' };

  try {
    // First try to get content from the API
    const docResult = await fetchDocumentation(resourceParams.provider, resourceParams.resource);
    const resourceName = resourceParams.resource;
    const providerName = resourceParams.provider;

    // Create metadata for the response
    const metadata: Record<string, any> = {
      provider: providerName,
      resource: resourceName,
      latestVersion: latestVersion || 'unknown',
      documentationUrl: url
    };

    // If we have documentation from the API
    if (docResult && docResult.content) {
      console.log(`Successfully retrieved documentation for ${resourceName} from API`);
      
      // Extract example usage from the content
      const usageSnippet = extractUsageFromApiContent(docResult.content);
      
      // If we found an example usage, format it properly
      if (usageSnippet !== '') {
        const markdownResponse = formatAsMarkdown(`## ${resourceName} Example Usage

\`\`\`hcl
${usageSnippet}
\`\`\`

[View Full Documentation for ${resourceName}](${url})
`);

        // Enhance metadata
        metadata.documentSource = 'api';
        metadata.docId = docResult.docId;
        
        // Add compatibility information
        addContextInfo(metadata, "compatibility", {
          terraformCoreVersions: "Terraform 0.12 and later",
          lastUpdated: new Date().toISOString()
        });

        return createStandardResponse("success", markdownResponse, metadata);
      }
      
      // If no example but we have content, return the full markdown content
      const markdownResponse = `## ${resourceName} Documentation

${docResult.content}

[View Full Documentation for ${resourceName}](${url})`;
      
      metadata.documentSource = 'api';
      metadata.docId = docResult.docId;
      metadata.hasExampleUsage = false;
      
      return createStandardResponse("success", markdownResponse, metadata);
    }

    // Fall back to generating a template example if API failed
    const templateExample = generateTemplateExample(resourceName, providerName);
    const resourceDescription = getResourceDescription(resourceName, providerName);
    
    const content = `## ${resourceName} - Generated Example

> **Note**: No official example was found in the Terraform Registry. A generated template is provided below.

### Resource Purpose
${resourceDescription}

### Basic Usage Pattern
\`\`\`hcl
${templateExample}
\`\`\`

### Important Notes
- This is a generated example and may not include all required attributes
- Always refer to the [official documentation](${url}) for complete details
- Test in a non-production environment before using in production

[View Full Documentation for ${resourceName}](${url})`;

    console.error(`No content found for ${resourceName}. Providing a generated template.`);
    
    // Add metadata for the fallback response
    metadata.documentSource = 'generated';
    metadata.hasExampleUsage = false;
    
    // Add compatibility information
    addContextInfo(metadata, "compatibility", {
      terraformCoreVersions: "Terraform 0.12 and later",
      lastUpdated: new Date().toISOString()
    });

    // Create a standard response with the fallback content
    return createStandardResponse("success", content, metadata);
  } catch (error) {
    console.error(`Error in resourceUsage: ${error}`);
    throw error;
  }
}