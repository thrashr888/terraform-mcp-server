#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequest,
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";

// ----------------- Interfaces for Input -----------------
interface ProviderLookupInput {
  provider?: string;   // e.g. "aws"
  namespace?: string;  // e.g. "hashicorp"
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

interface ProviderSchemaDetailsInput {
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

interface ExampleConfigGeneratorInput {
  provider: string;    // e.g. "aws"
  namespace: string;   // e.g. "hashicorp"
  resource: string;    // e.g. "aws_instance"
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
  };
}

// --------------------------------------------------------

const server = new Server(
  { name: "terraform-registry-mcp", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

const tools: Tool[] = [
  {
    name: "providerLookup",
    description: "Lookup Terraform provider details by name (latest version, etc).",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "resourceUsage",
    description: "Get an example usage of a Terraform resource and related resources.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "moduleRecommendations",
    description: "Search for and recommend Terraform modules for a given query.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "dataSourceLookup",
    description: "Retrieves the list of available data source identifiers for a given Terraform provider.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "providerSchemaDetails",
    description: "Retrieves the full schema details of a given provider, including resource and data source schemas.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "resourceArgumentDetails",
    description: "Fetches details about a specific resource type's arguments, including name, type, description, and requirements.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "moduleDetails",
    description: "Retrieves detailed metadata for a Terraform module including versions, inputs, outputs, and dependencies.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "exampleConfigGenerator",
    description: "Generates a minimal Terraform configuration (HCL) for a given provider and resource.",
    inputSchema: { type: "object", properties: {} }
  }
];

// ListToolsRequest
server.setRequestHandler(ListToolsRequestSchema, async () => {
  console.error("Received ListToolsRequest");
  return { tools };
});

// CallToolRequest
server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
  const toolName = request.params.tool;
  const input = request.params.input ?? {};

  console.error(`Received CallToolRequest for tool: ${toolName}, input: ${JSON.stringify(input)}`);

  try {
    switch (toolName) {
      case "providerLookup": {
        // Type input properly
        const { provider, namespace, name } = input as ProviderLookupInput;
        let providerStr = provider || name || "";
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
        const text = `Provider ${namespaceStr}/${providerStr}: latest version is ${latestVersion} (out of ${totalVersions} versions).`;

        console.error(`Response (providerLookup): ${text}`);
        return { content: [{ type: "text", text }] };
      }

      case "resourceUsage": {
        const { provider, resource, name } = input as ResourceUsageInput;
        const providerInput = provider ?? "";
        const resourceName = resource || name || "";
        if (!providerInput || !resourceName) {
          throw new Error("Both provider and resource name are required.");
        }

        let namespace = "hashicorp";
        let providerName = providerInput;
        if (providerInput.includes("/")) {
          const [ns, n] = providerInput.split("/");
          namespace = ns;
          providerName = n || "";
        }
        if (!providerName) {
          throw new Error("Invalid provider input.");
        }

        const docsUrl = `https://registry.terraform.io/providers/${namespace}/${providerName}/latest/docs/resources/${resourceName}`;
        const resp = await fetch(docsUrl);
        if (!resp.ok) {
          throw new Error(`Resource docs not found for ${providerName}/${resourceName}`);
        }
        const html = await resp.text();

        let usageSnippet = "";
        let relatedResources: string[] = [];
        const exampleIndex = html.indexOf(">Example Usage<");
        if (exampleIndex !== -1) {
          const codeStart = html.indexOf("<pre", exampleIndex);
          const codeEnd = html.indexOf("</pre>", codeStart);
          if (codeStart !== -1 && codeEnd !== -1) {
            let codeBlock = html.substring(codeStart, codeEnd);
            codeBlock = codeBlock.replace(/<[^>]+>/g, "");
            usageSnippet = codeBlock.trim();
          }
        }

        if (usageSnippet) {
          const regex = /\b([A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+)\b/g;
          const found = new Set<string>();
          let match;
          while ((match = regex.exec(usageSnippet)) !== null) {
            const ref = match[1];
            const resType = ref.split(".")[0];
            if (resType.toLowerCase() !== resourceName.toLowerCase()) {
              const resNameClean = resType.replace(/^data\\./, "");
              found.add(resNameClean);
            }
          }
          relatedResources = Array.from(found);
        }

        if (!usageSnippet) {
          const text = `No example usage found for resource "${resourceName}".`;
          console.error(`Response (resourceUsage): ${text}`);
          return { content: [{ type: "text", text }] };
        }

        let responseText = `Example usage for ${resourceName}:\n\\\`\\\`\\\`terraform\n${usageSnippet}\n\\\`\\\`\\\`\n`;
        if (relatedResources.length > 0) {
          responseText += `Related resources: ${relatedResources.join(", ")}`;
        } else {
          responseText += `Related resources: (none found)`;
        }
        console.error(
          `Response (resourceUsage): [snippet omitted for brevity] Related: ${relatedResources.join(", ")}`
        );
        return { content: [{ type: "text", text: responseText }] };
      }

      case "moduleRecommendations": {
        const { query, keyword, provider } = input as ModuleRecommendationsInput;
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
          return { content: [{ type: "text", text }] };
        }
        let recommendationText = `Recommended modules for "${searchStr}":\n`;
        modules.forEach((mod: any, index: number) => {
          const name = `${mod.namespace}/${mod.name}`;
          const prov = mod.provider;
          const description = mod.description || "";
          recommendationText += `${index + 1}. ${name} (${prov}) - ${description}\n`;
        });
        recommendationText = recommendationText.trim();
        console.error(
          `Response (moduleRecommendations): Found ${modules.length} modules for "${searchStr}"`
        );
        return { content: [{ type: "text", text: recommendationText }] };
      }

      case "dataSourceLookup": {
        const { provider, namespace } = input as DataSourceLookupInput;
        if (!provider || !namespace) {
          throw new Error("Both provider and namespace are required.");
        }

        const url = `https://registry.terraform.io/v1/providers/${namespace}/${provider}/data-sources`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch data sources: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const dataSources = data.data_sources || [];
        const dataSourceNames = dataSources.map((ds: any) => ds.name || ds.id).filter(Boolean);

        if (dataSourceNames.length === 0) {
          throw new Error(`No data sources found for provider ${namespace}/${provider}`);
        }

        console.error(`Response (dataSourceLookup): Found ${dataSourceNames.length} data sources`);
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ data_sources: dataSourceNames }, null, 2)
          }]
        };
      }

      case "providerSchemaDetails": {
        const { provider, namespace } = input as ProviderSchemaDetailsInput;
        if (!provider || !namespace) {
          throw new Error("Both provider and namespace are required.");
        }

        const url = `https://registry.terraform.io/v1/providers/${namespace}/${provider}/schemas`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch provider schema: ${response.status} ${response.statusText}`);
        }

        const schemaJson = await response.json();
        console.error(`Response (providerSchemaDetails): Retrieved schema for ${namespace}/${provider}`);
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ provider_schema: schemaJson }, null, 2)
          }]
        };
      }

      case "resourceArgumentDetails": {
        const { provider, namespace, resource } = input as ResourceArgumentDetailsInput;
        if (!provider || !namespace || !resource) {
          throw new Error("Provider, namespace, and resource are required.");
        }

        const url = `https://registry.terraform.io/v1/providers/${namespace}/${provider}/resources/${resource}`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch resource schema: ${response.status} ${response.statusText}`);
        }

        const resourceSchema = await response.json() as ResourceSchema;
        const result: any[] = [];
        const attrs = resourceSchema.block?.attributes || {};

        for (const [name, attr] of Object.entries(attrs)) {
          const typedAttr = attr as SchemaAttribute;
          result.push({
            name,
            type: typedAttr.type || "unknown",
            description: typedAttr.description || "",
            required: typedAttr.required === true
          });
        }

        console.error(`Response (resourceArgumentDetails): Found ${result.length} arguments for ${resource}`);
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ arguments: result }, null, 2)
          }]
        };
      }

      case "moduleDetails": {
        const { namespace, module, provider } = input as ModuleDetailsInput;
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

        console.error(`Response (moduleDetails): Retrieved details for ${namespace}/${module}/${provider}`);
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              versions,
              inputs,
              outputs,
              dependencies
            }, null, 2)
          }]
        };
      }

      case "exampleConfigGenerator": {
        const { provider, namespace, resource } = input as ExampleConfigGeneratorInput;
        if (!provider || !namespace || !resource) {
          throw new Error("Provider, namespace, and resource are required.");
        }

        const url = `https://registry.terraform.io/v1/providers/${namespace}/${provider}/resources/${resource}`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch resource schema: ${response.status} ${response.statusText}`);
        }

        const schema = await response.json() as ResourceSchema;
        const attrs = schema.block?.attributes || {};

        let config = `resource "${resource}" "example" {\n`;
        for (const [name, attr] of Object.entries(attrs)) {
          const typedAttr = attr as SchemaAttribute;
          const isRequired = typedAttr.required === true && typedAttr.computed !== true;
          if (isRequired) {
            let placeholder;
            const type = typedAttr.type;
            if (typeof type === 'string') {
              if (type.includes("string")) placeholder = `"example"`;
              else if (type.includes("bool") || type.includes("boolean")) placeholder = "false";
              else if (type.includes("number") || type.includes("int")) placeholder = "0";
              else if (type.includes("list") || type.includes("set")) placeholder = "[]";
              else if (type.includes("map") || type.includes("object")) placeholder = "{}";
              else placeholder = `"example"`;
            } else {
              placeholder = "{}";
            }
            config += `  ${name} = ${placeholder}\n`;
          }
        }
        config += `}\n`;

        console.error(`Response (exampleConfigGenerator): Generated config for ${resource}`);
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ example_configuration: config }, null, 2)
          }]
        };
      }

      default:
        throw new Error(`Tool "${toolName}" is not recognized.`);
    }
  } catch (err: any) {
    const errMsg = err.message || String(err);
    console.error(`Error in tool ${toolName}: ${errMsg}`);
    return { content: [{ type: "text", text: `Error: ${errMsg}` }] };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("MCP server is running (stdio)...");