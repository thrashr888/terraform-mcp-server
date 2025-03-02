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

const VERSION = "0.9.3";

const tools: Tool[] = [
  {
    name: "providerLookup",
    description: "Lookup Terraform provider details by name (latest version, etc).",
    inputSchema: { 
      type: "object", 
      properties: {
        provider: { type: "string", description: "Provider name (e.g. 'aws')" },
        namespace: { type: "string", description: "Provider namespace (e.g. 'hashicorp')" },
        name: { type: "string", description: "Alternative name field (fallback if provider not specified)" }
      }
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
    description: "Retrieves the list of available data source identifiers for a given Terraform provider.",
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
    name: "providerSchemaDetails",
    description: "Retrieves the full schema details of a given provider, including resource and data source schemas.",
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
  {
    name: "exampleConfigGenerator",
    description: "Generates a minimal Terraform configuration (HCL) for a given provider and resource.",
    inputSchema: { 
      type: "object", 
      properties: {
        provider: { type: "string", description: "Provider name (e.g. 'aws')" },
        namespace: { type: "string", description: "Provider namespace (e.g. 'hashicorp')" },
        resource: { type: "string", description: "Resource name (e.g. 'aws_instance')" }
      },
      required: ["provider", "namespace", "resource"]
    }
  }
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
      const { provider, namespace, name } = arguments_ as unknown as ProviderLookupInput;
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
      // Retrieves example usage documentation for a Terraform resource
      // - Fetches the example code snippet from the provider's documentation
      // - Identifies and lists related resources used in the example
      // - Supports both namespace/provider and provider-only formats
      const { provider, resource, name } = arguments_ as unknown as ResourceUsageInput;
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

      console.error(`Fetching docs for ${namespace}/${providerName}/resources/${resourceName}`);
        
      // Try the direct API first (more reliable when available)
      const apiUrl = `https://registry.terraform.io/v1/providers/${namespace}/${providerName}/versions`;
      console.error(`Trying API URL: ${apiUrl}`);
        
      try {
        const versionsResp = await fetch(apiUrl);
        if (!versionsResp.ok) {
          throw new Error(`Failed to fetch provider versions: ${versionsResp.status}`);
        }
          
        const versionsData = await versionsResp.json();
        const latestVersion = versionsData.versions[versionsData.versions.length - 1].version;
        console.error(`Latest version: ${latestVersion}`);
          
        // Try to get documentation via API
        const docsApiUrl = `https://registry.terraform.io/v1/providers/${namespace}/${providerName}/${latestVersion}/docs/resources/${resourceName}`;
        console.error(`Trying docs API URL: ${docsApiUrl}`);
          
        const docsResp = await fetch(docsApiUrl);
        if (docsResp.ok) {
          const docsData = await docsResp.json();
          if (docsData.content && docsData.content.includes("```")) {
            // Extract code from markdown content
            const matches = docsData.content.match(/```(?:terraform|hcl)([\s\S]*?)```/);
            if (matches && matches[1]) {
              const usageSnippet = matches[1].trim();
                
              // Extract related resources
              const resourceRegex = /resource\s+"([^"]+)"/g;
              const dataSourceRegex = /data\s+"([^"]+)"/g;
              const resourceSet = new Set<string>();
                
              let match;
              while ((match = resourceRegex.exec(usageSnippet)) !== null) {
                if (match[1].toLowerCase() !== resourceName.toLowerCase()) {
                  resourceSet.add(match[1]);
                }
              }
                
              while ((match = dataSourceRegex.exec(usageSnippet)) !== null) {
                resourceSet.add(`data.${match[1]}`);
              }
                
              const relatedResources = Array.from(resourceSet);
                
              let responseText = `Example usage for ${resourceName}:\n\`\`\`terraform\n${usageSnippet}\n\`\`\`\n`;
              if (relatedResources.length > 0) {
                responseText += `Related resources: ${relatedResources.join(", ")}`;
              } else {
                responseText += "Related resources: (none found)";
              }
                
              console.error(`Response (resourceUsage via API): Found example with ${relatedResources.length} related resources`);
              return { content: [{ type: "text", text: responseText }] };
            }
          }
        }
          
        // If API method fails, fall back to HTML scraping
        console.error("API method failed or no example found in API response, falling back to HTML scraping");
      } catch (error: any) {
        console.error(`API attempt failed: ${error.message}`);
        console.error("Falling back to HTML scraping");
      }
        
      // Fallback to HTML scraping method
      const docsUrl = `https://registry.terraform.io/providers/${namespace}/${providerName}/latest/docs/resources/${resourceName}`;
      console.error(`Trying HTML docs URL: ${docsUrl}`);
        
      const resp = await fetch(docsUrl);
      if (!resp.ok) {
        throw new Error(`Resource docs not found for ${providerName}/${resourceName} (Status: ${resp.status})`);
      }
      const html = await resp.text();

      let usageSnippet = "";
      let relatedResources: string[] = [];
        
      // More robust HTML parsing for different page structures
      const exampleHeaders = [">Example Usage<", ">Basic Usage<", ">Basic example<", ">Example<"];
      let exampleIndex = -1;
        
      for (const header of exampleHeaders) {
        const idx = html.indexOf(header);
        if (idx !== -1) {
          exampleIndex = idx;
          break;
        }
      }
        
      if (exampleIndex !== -1) {
        console.error(`Found example section at index ${exampleIndex}`);
          
        // Look for various code block markers
        const codeMarkers = ["<pre", "<code", "class=\"language-"];
        let codeStart = -1;
          
        for (const marker of codeMarkers) {
          const idx = html.indexOf(marker, exampleIndex);
          if (idx !== -1 && (codeStart === -1 || idx < codeStart)) {
            codeStart = idx;
          }
        }
          
        if (codeStart !== -1) {
          console.error(`Found code block at index ${codeStart}`);
            
          // Find the corresponding end tag
          const endMarkers = ["</pre>", "</code>"];
          let codeEnd = -1;
            
          for (const marker of endMarkers) {
            const idx = html.indexOf(marker, codeStart);
            if (idx !== -1 && (codeEnd === -1 || idx < codeEnd)) {
              codeEnd = idx;
            }
          }
            
          if (codeEnd !== -1) {
            let codeBlock = html.substring(codeStart, codeEnd);
            // Remove HTML tags and decode HTML entities
            codeBlock = codeBlock.replace(/<[^>]+>/g, "");
            codeBlock = codeBlock.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, "\"");
            usageSnippet = codeBlock.trim();
              
            console.error(`Extracted code block of length ${usageSnippet.length}`);
          }
        }
      }

      if (usageSnippet) {
        // Improved regex for finding Terraform resources and data sources
        const resourceRegex = /resource\s+"([^"]+)"/g;
        const dataSourceRegex = /data\s+"([^"]+)"/g;
        const variableRegex = /\$\{([^.}]+)\.([^.}]+)(?:\.|\})/g;
          
        const found = new Set<string>();
        let match;
          
        // Find explicit resource declarations
        while ((match = resourceRegex.exec(usageSnippet)) !== null) {
          if (match[1].toLowerCase() !== resourceName.toLowerCase()) {
            found.add(match[1]);
          }
        }
          
        // Find data source declarations
        while ((match = dataSourceRegex.exec(usageSnippet)) !== null) {
          found.add(`data.${match[1]}`);
        }
          
        // Find resource references
        while ((match = variableRegex.exec(usageSnippet)) !== null) {
          const refType = match[1];
          if (refType !== "var" && refType !== "local" && refType !== "module") {
            found.add(refType);
          }
        }
          
        relatedResources = Array.from(found);
      }

      if (!usageSnippet) {
        // Try to find code blocks in other formats
        const markdownCodeBlockRegex = /```(?:terraform|hcl)([\s\S]*?)```/g;
        let match;
        while ((match = markdownCodeBlockRegex.exec(html)) !== null) {
          if (match[1] && match[1].includes(resourceName)) {
            usageSnippet = match[1].trim();
            break;
          }
        }
      }

      if (!usageSnippet) {
        // Instead of just returning an error message, extract and return the whole page content
        console.error(`No example usage found. Returning full documentation for resource "${resourceName}"`);
          
        // Extract the main content area from the HTML
        let content = "";
        const mainContentMarkers = [
          "<main", 
          "<div class=\"content\"", 
          "<article", 
          "<div class=\"section\""
        ];
          
        let contentStart = -1;
        for (const marker of mainContentMarkers) {
          const idx = html.indexOf(marker);
          if (idx !== -1) {
            contentStart = idx;
            break;
          }
        }
          
        if (contentStart !== -1) {
          // Find the corresponding end tag
          const endMarkers = ["</main>", "</article>", "</div>"];
          let contentEnd = html.length;
            
          for (const marker of endMarkers) {
            // Find the last occurrence of the marker
            const idx = html.lastIndexOf(marker);
            if (idx !== -1 && idx > contentStart && idx < contentEnd) {
              contentEnd = idx + marker.length;
            }
          }
            
          // Extract and clean up the content
          content = html.substring(contentStart, contentEnd);
            
          // Convert HTML to plain text
          content = content
            .replace(/<h1[^>]*>(.*?)<\/h1>/gi, "\n# $1\n")
            .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "\n## $1\n")
            .replace(/<h3[^>]*>(.*?)<\/h3>/gi, "\n### $1\n")
            .replace(/<h4[^>]*>(.*?)<\/h4>/gi, "\n#### $1\n")
            .replace(/<p[^>]*>(.*?)<\/p>/gi, "\n$1\n")
            .replace(/<li[^>]*>(.*?)<\/li>/gi, "\n- $1")
            .replace(/<code[^>]*>(.*?)<\/code>/gi, "`$1`")
            .replace(/<pre[^>]*>(.*?)<\/pre>/gi, "\n```\n$1\n```\n")
            .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)")
            .replace(/<[^>]+>/g, "") // Remove remaining HTML tags
            .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, "\"")
            .replace(/\n{3,}/g, "\n\n"); // Replace multiple newlines with just two
              
          return { 
            content: [{ 
              type: "text", 
              text: `Documentation for ${resourceName}:\n\n${content.trim()}\n\nFor full documentation, visit: ${docsUrl}` 
            }] 
          };
        }
          
        // If we couldn't extract content, provide a link to the docs
        const text = `No example usage found for resource "${resourceName}". Please check the documentation at ${docsUrl}`;
        console.error(`Response (resourceUsage): ${text}`);
        return { content: [{ type: "text", text }] };
      }

      let responseText = `Example usage for ${resourceName}:\n\`\`\`terraform\n${usageSnippet}\n\`\`\`\n`;
      if (relatedResources.length > 0) {
        responseText += `Related resources: ${relatedResources.join(", ")}`;
      } else {
        responseText += "Related resources: (none found)";
      }
      console.error(
        `Response (resourceUsage): Found example of length ${usageSnippet.length} with ${relatedResources.length} related resources`
      );
      return { content: [{ type: "text", text: responseText }] };
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
      // Lists all available data sources for a specific provider
      // - Fetches complete list of data sources from provider's registry
      // - Returns data source names/identifiers
      // - Requires both namespace and provider name
      const { provider, namespace } = arguments_ as unknown as DataSourceLookupInput;
      if (!provider || !namespace) {
        throw new Error("Both provider and namespace are required.");
      }

      console.error(`Attempting to fetch data sources for ${namespace}/${provider}`);
        
      // First approach: Direct data sources API endpoint
      const url = `https://registry.terraform.io/v1/providers/${namespace}/${provider}/data-sources`;
      console.error(`Trying data sources API URL: ${url}`);
        
      try {
        // Retry logic - attempt up to 3 times with exponential backoff
        let response = null;
        let attempt = 0;
        const maxAttempts = 3;
          
        while (attempt < maxAttempts) {
          try {
            attempt++;
            console.error(`API attempt ${attempt}/${maxAttempts}`);
            response = await fetch(url);
              
            if (response.ok) {
              break;
            } else {
              if (attempt < maxAttempts) {
                // Exponential backoff
                const delay = Math.pow(2, attempt) * 500;
                console.error(`Attempt ${attempt} failed with status ${response.status}. Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
              }
            }
          } catch (err) {
            console.error(`Attempt ${attempt} failed with error: ${err}`);
            if (attempt >= maxAttempts) throw err;
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
          
        if (response && response.ok) {
          const data = await response.json();
          const dataSources = data.data_sources || [];
          const dataSourceNames = dataSources.map((ds: any) => ds.name || ds.id).filter(Boolean);
            
          if (dataSourceNames.length > 0) {
            console.error(`Successfully found ${dataSourceNames.length} data sources via API`);
              
            // Format response for better readability
            let responseText = `Data sources for provider ${namespace}/${provider}:\n\n`;
            dataSourceNames.sort().forEach((name: string) => {
              responseText += `- ${name}\n`;
            });
              
            return {
              content: [{ type: "text", text: responseText }]
            };
          }
          console.error("API returned successful response but no data sources found. Trying fallback method.");
        } else {
          console.error(`API response not OK: ${response?.status} ${response?.statusText}`);
        }
      } catch (err) {
        console.error(`Error in primary API approach: ${err}. Trying fallback method.`);
      }
        
      // Fallback approach: Try to get versions first, then latest version schema
      console.error("Attempting fallback method using provider schema...");
      try {
        // Get provider versions
        const versionsUrl = `https://registry.terraform.io/v1/providers/${namespace}/${provider}/versions`;
        console.error(`Fetching versions from: ${versionsUrl}`);
          
        const versionsResp = await fetch(versionsUrl);
        if (!versionsResp.ok) {
          throw new Error(`Failed to fetch provider versions: ${versionsResp.status}`);
        }
          
        const versionsData = await versionsResp.json();
        if (!versionsData.versions || versionsData.versions.length === 0) {
          throw new Error("No provider versions found");
        }
          
        const latestVersion = versionsData.versions[versionsData.versions.length - 1].version;
        console.error(`Found latest version: ${latestVersion}`);
          
        // Get provider schema for latest version
        const schemaUrl = `https://registry.terraform.io/v1/providers/${namespace}/${provider}/${latestVersion}/docs`;
        console.error(`Fetching schema from: ${schemaUrl}`);
          
        const schemaResp = await fetch(schemaUrl);
        if (!schemaResp.ok) {
          throw new Error(`Failed to fetch provider schema: ${schemaResp.status}`);
        }
          
        const schemaData = await schemaResp.json();
          
        // Extract data sources from schema - look for entries with "data" category
        const dataSourceDocs = schemaData.docs.filter((doc: any) => 
          doc.category === "data" || 
            doc.title?.toLowerCase().startsWith("data source") ||
            doc.path?.includes("/data-sources/")
        );
          
        if (dataSourceDocs.length > 0) {
          console.error(`Found ${dataSourceDocs.length} data sources via schema docs`);
            
          // Extract data source names from paths or titles
          const dataSourceNames = dataSourceDocs.map((doc: any) => {
            // Try to extract from path
            if (doc.path) {
              const pathParts = doc.path.split("/");
              const lastPart = pathParts[pathParts.length - 1];
              if (lastPart) return lastPart;
            }
              
            // Fallback to title
            if (doc.title) {
              const title = doc.title.toLowerCase();
              if (title.startsWith("data source:")) {
                return title.replace("data source:", "").trim();
              } else {
                return doc.title;
              }
            }
              
            return null;
          }).filter(Boolean);
            
          // Format response for better readability
          let responseText = `Data sources for provider ${namespace}/${provider} (v${latestVersion}):\n\n`;
          dataSourceNames.sort().forEach((name: string) => {
            responseText += `- ${name}\n`;
          });
            
          return {
            content: [{ type: "text", text: responseText }]
          };
        }
          
        // If we still don't have data sources, try a more direct approach
        // Use the existence of documentation structures to infer data sources
        const docsWithHints = schemaData.docs.filter((doc: any) => 
          doc.title?.toLowerCase().includes("data") ||
            doc.description?.toLowerCase().includes("data source") ||
            doc.path?.includes("data")
        );
          
        if (docsWithHints.length > 0) {
          console.error(`Found ${docsWithHints.length} potential data sources via doc hints`);
            
          let responseText = `Potential data sources for provider ${namespace}/${provider} (v${latestVersion}):\n\n`;
            
          docsWithHints.forEach((doc: any) => {
            responseText += `- ${doc.title || doc.path || "Unknown"}\n`;
          });
            
          return {
            content: [{ type: "text", text: responseText }]
          };
        }
      } catch (err) {
        console.error(`Error in fallback approach: ${err}`);
      }
        
      // If all approaches fail, provide a helpful error message
      return {
        content: [{
          type: "text",
          text: `Unable to retrieve data sources for provider ${namespace}/${provider}. The provider might not be available in the registry, or the registry API might have changed.\n\nPlease refer to the official documentation at: https://registry.terraform.io/providers/${namespace}/${provider}/latest/docs`
        }]
      };
    }

    case "providerSchemaDetails": {
      // Retrieves the complete schema for a Terraform provider
      // - Gets full provider configuration including resources and data sources
      // - Returns raw schema JSON for detailed provider inspection
      // - Requires both namespace and provider name
      const { provider, namespace } = arguments_ as unknown as ProviderSchemaDetailsInput;
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
      // Fetches detailed information about a specific resource's arguments
      // - Gets argument names, types, descriptions, and requirements
      // - Helps understand how to configure a specific resource
      // - Requires provider, namespace, and resource name
      const { provider, namespace, resource } = arguments_ as unknown as ResourceArgumentDetailsInput;
      if (!provider || !namespace || !resource) {
        throw new Error("Provider, namespace, and resource are required.");
      }

      console.error(`Fetching argument details for ${namespace}/${provider}/resources/${resource}`);

      // First try the older API endpoint style
      const url = `https://registry.terraform.io/v1/providers/${namespace}/${provider}/resources/${resource}`;
      console.error(`Trying API URL: ${url}`);
        
      try {
        const response = await fetch(url);
          
        if (!response.ok) {
          console.error(`Resource API endpoint failed with status: ${response.status}`);
          throw new Error("API endpoint failed");
        }
          
        const resourceSchema = await response.json();
        console.error(`Got resource schema JSON response of length: ${JSON.stringify(resourceSchema).length}`);
          
        // Extract the attributes and nested blocks from the schema
        const result: any[] = [];
          
        if (resourceSchema.block?.attributes) {
          const attrs = resourceSchema.block.attributes;
          for (const [name, attr] of Object.entries(attrs)) {
            const typedAttr = attr as SchemaAttribute;
            result.push({
              name,
              type: typeof typedAttr.type === "object" 
                ? JSON.stringify(typedAttr.type) 
                : (typedAttr.type || "unknown"),
              description: typedAttr.description || "",
              required: typedAttr.required === true,
              computed: typedAttr.computed === true,
              optional: !typedAttr.required && !typedAttr.computed,
              category: "attribute"
            });
          }
        }
          
        // Handle nested blocks if present
        if (resourceSchema.block?.block_types) {
          const blocks = resourceSchema.block.block_types;
          for (const [name, block] of Object.entries(blocks)) {
            result.push({
              name,
              type: "block",
              description: (block as any).description || "",
              required: (block as any).min_items > 0,
              nesting_mode: (block as any).nesting_mode,
              min_items: (block as any).min_items || 0,
              max_items: (block as any).max_items || 0,
              category: "block"
            });
              
            // Recursively process nested attributes if available
            if ((block as any).block?.attributes) {
              const nestedAttrs = (block as any).block.attributes;
              for (const [attrName, attr] of Object.entries(nestedAttrs)) {
                const typedAttr = attr as SchemaAttribute;
                result.push({
                  name: `${name}.${attrName}`,
                  type: typeof typedAttr.type === "object"
                    ? JSON.stringify(typedAttr.type)
                    : (typedAttr.type || "unknown"),
                  description: typedAttr.description || "",
                  required: typedAttr.required === true,
                  computed: typedAttr.computed === true,
                  optional: !typedAttr.required && !typedAttr.computed,
                  parent_block: name,
                  category: "nested_attribute"
                });
              }
            }
          }
        }
          
        console.error(`Response (resourceArgumentDetails): Found ${result.length} arguments for ${resource}`);
          
        // Sort results: required attributes first, then optional, then blocks
        result.sort((a, b) => {
          // First sort by category (attribute, block, nested_attribute)
          if (a.category !== b.category) {
            return a.category.localeCompare(b.category);
          }
            
          // Then by required status (required first)
          if (a.required !== b.required) {
            return a.required ? -1 : 1;
          }
            
          // Then by name
          return a.name.localeCompare(b.name);
        });
          
        // Format the output to be more readable
        let formattedOutput = `Resource: ${resource}\n\n`;
          
        // Required Attributes Section
        const requiredAttrs = result.filter(item => item.category === "attribute" && item.required);
        if (requiredAttrs.length > 0) {
          formattedOutput += "REQUIRED ATTRIBUTES:\n";
          requiredAttrs.forEach(attr => {
            formattedOutput += `  * ${attr.name} (${attr.type})\n`;
            if (attr.description) {
              formattedOutput += `      ${attr.description}\n`;
            }
          });
          formattedOutput += "\n";
        }
          
        // Optional Attributes Section
        const optionalAttrs = result.filter(item => item.category === "attribute" && !item.required);
        if (optionalAttrs.length > 0) {
          formattedOutput += "OPTIONAL ATTRIBUTES:\n";
          optionalAttrs.forEach(attr => {
            const computedStr = attr.computed ? " (computed)" : "";
            formattedOutput += `  * ${attr.name} (${attr.type})${computedStr}\n`;
            if (attr.description) {
              formattedOutput += `      ${attr.description}\n`;
            }
          });
          formattedOutput += "\n";
        }
          
        // Blocks Section
        const blocks = result.filter(item => item.category === "block");
        if (blocks.length > 0) {
          formattedOutput += "BLOCKS:\n";
          blocks.forEach(block => {
            const required = block.required ? " (required)" : "";
            const maxItems = block.max_items > 0 ? `, max: ${block.max_items}` : "";
            formattedOutput += `  * ${block.name}${required} (min: ${block.min_items}${maxItems})\n`;
            if (block.description) {
              formattedOutput += `      ${block.description}\n`;
            }
              
            // Add nested attributes for this block
            const nestedAttrs = result.filter(item => 
              item.category === "nested_attribute" && item.parent_block === block.name
            );
              
            if (nestedAttrs.length > 0) {
              formattedOutput += "      ATTRIBUTES:\n";
              nestedAttrs.forEach(attr => {
                const required = attr.required ? " (required)" : "";
                const computed = attr.computed ? " (computed)" : "";
                formattedOutput += `        - ${attr.name.split(".")[1]} (${attr.type})${required}${computed}\n`;
                if (attr.description) {
                  formattedOutput += `          ${attr.description}\n`;
                }
              });
            }
            formattedOutput += "\n";
          });
        }
          
        return {
          content: [{
            type: "text",
            text: formattedOutput
          }]
        };
          
      } catch (error) {
        console.error(`Original API approach failed: ${error}`);
        console.error("Trying fallback approach...");
      }
        
      // Fallback: Try to get details from the provider versions and documentation
      try {
        // Get latest provider version
        const versionsUrl = `https://registry.terraform.io/v1/providers/${namespace}/${provider}/versions`;
        console.error(`Fetching versions from: ${versionsUrl}`);
          
        const versionsResp = await fetch(versionsUrl);
        if (!versionsResp.ok) {
          throw new Error(`Failed to fetch provider versions: ${versionsResp.status}`);
        }
          
        const versionsData = await versionsResp.json();
        if (!versionsData.versions || versionsData.versions.length === 0) {
          throw new Error("No provider versions found");
        }
          
        const latestVersion = versionsData.versions[versionsData.versions.length - 1].version;
        console.error(`Found latest version: ${latestVersion}`);
          
        // Get documentation for the specific resource
        const docsUrl = `https://registry.terraform.io/v1/providers/${namespace}/${provider}/${latestVersion}/docs/resources/${resource}`;
        console.error(`Fetching docs from: ${docsUrl}`);
          
        const docsResp = await fetch(docsUrl);
        if (!docsResp.ok) {
          throw new Error(`Failed to fetch resource docs: ${docsResp.status}`);
        }
          
        const docsData = await docsResp.json();
        const content = docsData.content || "";
          
        // Extract argument reference section from the markdown content
        let argSection = "";
        const argSectionRegex = /## (?:Argument Reference|Arguments|Resource Arguments|Schema)([\s\S]*?)(?:## |$)/i;
        const match = content.match(argSectionRegex);
          
        if (match && match[1]) {
          argSection = match[1].trim();
        } else {
          // If no specific section, use the whole content
          argSection = content;
        }
          
        // Extract arguments and their descriptions using markdown list patterns
        const argRegex = /[*-]\s+`([^`]+)`\s+-\s+([\s\S]*?)(?=\n[*-]\s+`|\n##|$)/g;
        let argMatch;
        const args = [];
          
        while ((argMatch = argRegex.exec(argSection)) !== null) {
          const name = argMatch[1];
          const description = argMatch[2].trim();
            
          // Try to determine if it's required
          const isRequired = description.toLowerCase().includes("required") && 
                              !description.toLowerCase().includes("not required") &&
                              !description.toLowerCase().includes("conditionally required");
            
          args.push({
            name,
            description,
            required: isRequired,
            source: "documentation"
          });
        }
          
        // Sort arguments: required first, then alphabetically
        args.sort((a, b) => {
          if (a.required !== b.required) {
            return a.required ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        });
          
        // Format the output
        let formattedOutput = `Resource: ${resource} (from documentation)\n\n`;
          
        if (args.length > 0) {
          const requiredArgs = args.filter(arg => arg.required);
          const optionalArgs = args.filter(arg => !arg.required);
            
          if (requiredArgs.length > 0) {
            formattedOutput += "REQUIRED ARGUMENTS:\n";
            requiredArgs.forEach(arg => {
              formattedOutput += `  * ${arg.name}\n`;
              formattedOutput += `      ${arg.description}\n\n`;
            });
          }
            
          if (optionalArgs.length > 0) {
            formattedOutput += "OPTIONAL ARGUMENTS:\n";
            optionalArgs.forEach(arg => {
              formattedOutput += `  * ${arg.name}\n`;
              formattedOutput += `      ${arg.description}\n\n`;
            });
          }
        } else {
          // If we couldn't extract arguments in the expected format,
          // return the raw argument section
          formattedOutput += "Argument Reference:\n\n";
          formattedOutput += argSection;
        }
          
        // Add a note about the documentation source
        formattedOutput += `\nFor complete documentation, visit: https://registry.terraform.io/providers/${namespace}/${provider}/latest/docs/resources/${resource}`;
          
        return {
          content: [{
            type: "text",
            text: formattedOutput
          }]
        };
      } catch (error) {
        console.error(`Fallback approach failed: ${error}`);
        throw new Error(`Failed to retrieve information for resource ${resource}: ${error}`);
      }
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
      // Generates a minimal working example configuration for a resource
      // - Creates HCL configuration with required attributes
      // - Sets appropriate placeholder values based on attribute types
      // - Helps users get started with new resources quickly
      const { provider, namespace, resource } = arguments_ as unknown as ExampleConfigGeneratorInput;
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
          if (typeof type === "string") {
            if (type.includes("string")) placeholder = "\"example\"";
            else if (type.includes("bool") || type.includes("boolean")) placeholder = "false";
            else if (type.includes("number") || type.includes("int")) placeholder = "0";
            else if (type.includes("list") || type.includes("set")) placeholder = "[]";
            else if (type.includes("map") || type.includes("object")) placeholder = "{}";
            else placeholder = "\"example\"";
          } else {
            placeholder = "{}";
          }
          config += `  ${name} = ${placeholder}\n`;
        }
      }
      config += "}\n";

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
console.error(`terraform-registry-mcp v${VERSION} is running (stdio)...`);