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

const VERSION = "0.9.5";

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
        const schemaUrl = `https://registry.terraform.io/v1/providers/${namespace}/${provider}/schemas`;
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
            content: [{
              type: "text",
              text: responseText
            }]
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

      try {
        // Step 1: First get the provider version ID
        const providersUrl = `https://registry.terraform.io/v2/provider-versions?filter%5Bname%5D=${namespace}%2F${provider}`;
        console.error(`Fetching provider version ID from: ${providersUrl}`);
          
        const providersResp = await fetch(providersUrl);
        if (!providersResp.ok) {
          throw new Error(`Failed to fetch provider info: ${providersResp.status} ${providersResp.statusText}`);
        }
          
        const providersData = await providersResp.json();
        if (!providersData.data || providersData.data.length === 0) {
          throw new Error(`No provider data found for ${namespace}/${provider}`);
        }
          
        // Get the latest version's ID
        const providerVersionId = providersData.data[0].id;
        console.error(`Found provider version ID: ${providerVersionId}`);
          
        // Step 2: Now get the resource documentation
        const resourceDocsUrl = `https://registry.terraform.io/v2/provider-docs?filter%5Bprovider-version%5D=${providerVersionId}&filter%5Bcategory%5D=resources&filter%5Bslug%5D=${resource}&filter%5Blanguage%5D=hcl&page%5Bsize%5D=1`;
        console.error(`Fetching resource docs from: ${resourceDocsUrl}`);
          
        const resourceDocsResp = await fetch(resourceDocsUrl);
        if (!resourceDocsResp.ok) {
          throw new Error(`Failed to fetch resource docs: ${resourceDocsResp.status} ${resourceDocsResp.statusText}`);
        }
          
        const resourceDocsData = await resourceDocsResp.json();
        if (!resourceDocsData.data || resourceDocsData.data.length === 0) {
          throw new Error(`No documentation found for resource ${resource}`);
        }
          
        // Get the resource doc ID
        const resourceDocId = resourceDocsData.data[0].id;
        console.error(`Found resource doc ID: ${resourceDocId}`);
          
        // Step 3: Get the detailed resource documentation
        const resourceDetailUrl = `https://registry.terraform.io/v2/provider-docs/${resourceDocId}`;
        console.error(`Fetching resource detail from: ${resourceDetailUrl}`);
          
        const resourceDetailResp = await fetch(resourceDetailUrl);
        if (!resourceDetailResp.ok) {
          throw new Error(`Failed to fetch resource detail: ${resourceDetailResp.status} ${resourceDetailResp.statusText}`);
        }
          
        const resourceDetail = await resourceDetailResp.json();
          
        // Extract the arguments from the documentation
        const result: any[] = [];
        
        // Parse the resource document content
        const docContent = resourceDetail.data.attributes.content;
        
        // Extract argument blocks - look for "## Argument Reference" or similar sections
        let argumentsSection = "";
        
        // Simple parsing approach to extract the arguments section
        const argSectionRegex = /## Argument Reference([\s\S]*?)(?:## |$)/i;
        const argMatch = docContent.match(argSectionRegex);
        
        if (argMatch && argMatch[1]) {
          argumentsSection = argMatch[1].trim();
        }
        
        // Parse the individual arguments using regex - looking for patterns like:
        // * `name` - (Required) Description text...
        // * `another_name` - (Optional) More description...
        const argRegex = /\* [`"]([^`"]+)[`"] - \(([^\)]+)\) ([\s\S]*?)(?=\n\* [`"]|$)/g;
        
        let match;
        while ((match = argRegex.exec(argumentsSection)) !== null) {
          const argName = match[1];
          const requirement = match[2].toLowerCase();
          const description = match[3].trim();
          
          result.push({
            name: argName,
            type: "string", // Default as documentation often doesn't specify types clearly
            description: description,
            required: requirement.includes("required"),
            computed: requirement.includes("computed"),
            optional: requirement.includes("optional"),
            category: "attribute"
          });
        }
        
        // If no arguments were found, provide a helpful message
        if (result.length === 0) {
          const docUrl = `https://registry.terraform.io/providers/${namespace}/${provider}/latest/docs/resources/${resource}`;
          
          return {
            content: [{
              type: "text",
              text: `Could not parse arguments from the resource documentation. Please refer to the official documentation at: ${docUrl}`
            }]
          };
        }
        
        console.error(`Response (resourceArgumentDetails): Found ${result.length} arguments for ${resource}`);
        
        // Format the response
        return {
          content: [
            {
              type: "text", 
              text: `Arguments for resource: ${resource}\n\nFound ${result.length} arguments`
            },
            {
              type: "table",
              headings: ["Name", "Type", "Required", "Computed", "Optional", "Description"],
              rows: result.map(arg => [
                arg.name,
                arg.type || "string",
                arg.required ? "Yes" : "No",
                arg.computed ? "Yes" : "No",
                arg.optional ? "Yes" : "No",
                arg.description
              ])
            }
          ]
        };
      } catch (error) {
        console.error("Error in resourceArgumentDetails:", error);
        
        // Fallback - direct the user to the documentation
        return {
          content: [{
            type: "text",
            text: `Unable to retrieve argument details for resource ${resource} in provider ${namespace}/${provider}. The API might have changed or the resource might not exist.\n\nPlease refer to the official documentation at: https://registry.terraform.io/providers/${namespace}/${provider}/latest/docs/resources/${resource}`
          }]
        };
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

      try {
        // Since the provider version APIs are returning 400 errors, let's use a simpler approach
        // based on the official documentation URLs

        // First, try to get argument details using our existing tool
        console.error(`Attempting to get resource argument details for ${namespace}/${provider}/${resource}`);
        
        // Create a simplified example configuration based on resource name
        let config = `resource "${resource}" "example" {\n`;
        
        // Try to access the resource documentation directly (fallback approach)
        const docUrl = `https://registry.terraform.io/providers/${namespace}/${provider}/latest/docs/resources/${resource}`;
        console.error(`Documentation URL: ${docUrl}`);
        
        // Add some common attributes based on resource type patterns
        if (resource.includes("instance")) {
          config += `  # Common attributes for instance resources\n`;
          config += `  ami           = "ami-12345678" # Replace with a valid AMI ID\n`;
          config += `  instance_type = "t2.micro"\n`;
        } else if (resource.includes("bucket")) {
          config += `  # Common attributes for bucket resources\n`;
          config += `  bucket = "my-unique-bucket-name"\n`;
        } else if (resource.includes("vpc")) {
          config += `  # Common attributes for VPC resources\n`;
          config += `  cidr_block = "10.0.0.0/16"\n`;
        } else if (resource.includes("cluster")) {
          config += `  # Common attributes for cluster resources\n`;
          config += `  name = "example-cluster"\n`;
        } else if (resource.includes("database")) {
          config += `  # Common attributes for database resources\n`;
          config += `  name = "example-database"\n`;
        } else if (resource.includes("function")) {
          config += `  # Common attributes for function resources\n`;
          config += `  name = "example-function"\n`;
        } else if (resource.includes("role")) {
          config += `  # Common attributes for IAM role resources\n`;
          config += `  name = "example-role"\n`;
        } else if (resource.includes("key")) {
          config += `  # Common attributes for key resources\n`;
          config += `  key_name = "example-key"\n`;
        } else if (resource.includes("group")) {
          config += `  # Common attributes for group resources\n`;
          config += `  name = "example-group"\n`;
        } else {
          config += `  # No specific attributes could be determined for this resource type\n`;
          config += `  # Replace this comment with required attributes for your use case\n`;
        }
        
        // Add a note about documentation
        config += `\n  # This is a minimal example. For complete attributes, see:\n`;
        config += `  # ${docUrl}\n`;
        config += `}\n`;

        console.error(`Response (exampleConfigGenerator): Generated fallback config for ${resource}`);
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ example_configuration: config }, null, 2)
          }]
        };
      } catch (error) {
        console.error(`Error generating example configuration: ${error}`);
        throw new Error(`Failed to generate example configuration: ${error}`);
      }
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