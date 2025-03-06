import logger from "./logger.js";
import { REGISTRY_API_BASE, REGISTRY_API_V2, REQUEST_TIMEOUT_MS } from "../config.js";
import { ProviderVersion } from "../types/index.js";

// Add type imports for global types
type RequestInit = globalThis.RequestInit;

/**
 * Helper function to fetch data from a URL with timeout
 * @param url URL to fetch data from
 * @param options Fetch options
 * @returns Parsed JSON response or throws error
 */
export async function fetchData<T>(url: string, options: RequestInit = {}): Promise<T> {
  const controller = new globalThis.AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    logger.debug(`Fetching data from: ${url}`);
    
    try {
      // Merge options with signal from AbortController
      const fetchOptions = {
        ...options,
        signal: controller.signal
      };
      
      const response = await fetch(url, fetchOptions);
      
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
      }
      
      return await response.json() as T;
    } finally {
      // Clear the timeout regardless of success or failure
      clearTimeout(timeoutId);
    }
  } catch (error) {
    // Handle timeout errors specifically
    if (error instanceof Error && error.name === "AbortError") {
      logger.error(`Request to ${url} timed out after ${REQUEST_TIMEOUT_MS}ms`);
      throw new Error(`Request timed out after ${REQUEST_TIMEOUT_MS}ms`);
    }
    
    logger.error(`Error fetching data from ${url}:`, error);
    throw error;
  }
}

/**
 * Helper function to fetch documentation content from the Terraform Registry API
 * @param provider Provider name
 * @param resource Resource name
 * @returns Documentation content and ID or null if not found
 */
export async function fetchDocumentation(
  provider: string, 
  resource: string
): Promise<{content: string; docId: string} | null> {
  const controller = new globalThis.AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  
  try {
    // First, find the document ID by querying with filters
    const filterUrl = `${REGISTRY_API_V2}/provider-docs?filter%5Bcategory%5D=resources&filter%5Bslug%5D=${resource}&filter%5Blanguage%5D=hcl&page%5Bsize%5D=1`;
    
    logger.debug(`Fetching document ID from: ${filterUrl}`);
    const filterResponse = await fetch(filterUrl, { signal: controller.signal });
    
    if (!filterResponse.ok) {
      logger.error(`Failed to fetch document ID: ${filterResponse.status} ${filterResponse.statusText}`);
      return null;
    }
    
    const filterData = await filterResponse.json();
    
    if (!filterData.data || filterData.data.length === 0) {
      logger.warn(`No documentation found for resource: ${resource}`);
      return null;
    }
    
    const docId = filterData.data[0].id;
    
    // Now fetch the full documentation using the document ID
    const docUrl = `${REGISTRY_API_V2}/provider-docs/${docId}`;
    
    logger.debug(`Fetching documentation content from: ${docUrl}`);
    const docResponse = await fetch(docUrl, { signal: controller.signal });
    
    if (!docResponse.ok) {
      logger.error(`Failed to fetch documentation content: ${docResponse.status} ${docResponse.statusText}`);
      return null;
    }
    
    const docData = await docResponse.json();
    
    if (!docData.data || !docData.data.attributes || !docData.data.attributes.content) {
      logger.warn(`Documentation content not found for resource: ${resource}`);
      return null;
    }
    
    return {
      content: docData.data.attributes.content,
      docId: docId
    };
  } catch (error) {
    // Handle timeout errors specifically
    if (error instanceof Error && error.name === "AbortError") {
      logger.error(`Documentation request for ${provider}/${resource} timed out after ${REQUEST_TIMEOUT_MS}ms`);
    } else {
      logger.error("Error fetching documentation:", error);
    }
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Get the full URL to provider documentation
 * @param namespace Provider namespace
 * @param provider Provider name
 * @returns Formatted URL to provider documentation
 */
export function getProviderDocUrl(namespace: string, provider: string): string {
  return `${REGISTRY_API_BASE}/providers/${namespace}/${provider}`;
}

/**
 * Get the full URL to resource documentation
 * @param namespace Provider namespace
 * @param provider Provider name
 * @param resource Resource name
 * @returns Formatted URL to resource documentation
 */
export function getResourceDocUrl(namespace: string, provider: string, resource: string): string {
  return `${REGISTRY_API_BASE}/providers/${namespace}/${provider}/latest/docs/resources/${resource}`;
}

/**
 * Get the full URL to module documentation
 * @param namespace Module namespace
 * @param module Module name
 * @param provider Provider name
 * @returns Formatted URL to module documentation
 */
export function getModuleDocUrl(namespace: string, module: string, provider: string): string {
  return `${REGISTRY_API_BASE}/modules/${namespace}/${module}/${provider}`;
}

/**
 * Fetch provider versions from the registry
 * @param namespace Provider namespace
 * @param provider Provider name
 * @returns Array of provider versions
 */
export async function fetchProviderVersions(
  namespace: string,
  provider: string
): Promise<ProviderVersion[]> {
  const url = `${REGISTRY_API_V2}/providers/${namespace}/${provider}?include=provider-versions`;
  const response = await fetchData<any>(url);
  return response.included || [];
}

/**
 * Get version ID for a specific provider version
 * @param versions Array of provider versions
 * @param targetVersion Version to find (or "latest")
 * @returns Version ID and version string
 */
export async function getVersionId(
  versions: ProviderVersion[],
  targetVersion: string = "latest"
): Promise<{ versionId: string; version: string; latestVersion: string }> {
  if (versions.length === 0) {
    throw new Error("No versions found for provider");
  }

  const latestVersion = versions[versions.length - 1].attributes.version;
  
  if (targetVersion === "latest") {
    return {
      versionId: versions[versions.length - 1].id,
      version: latestVersion,
      latestVersion
    };
  }

  const matchingVersion = versions.find(v => v.attributes.version === targetVersion);
  if (!matchingVersion) {
    throw new Error(`Version ${targetVersion} not found. Latest version is ${latestVersion}`);
  }

  return {
    versionId: matchingVersion.id,
    version: targetVersion,
    latestVersion
  };
}

/**
 * Extract arguments from documentation content
 */
function extractArguments(content: string) {
  const args = {
    required: [] as any[],
    optional: [] as any[]
  };
  
  // Find the arguments section
  const argsMatch = content.match(/## Argument Reference\s*\n([\s\S]*?)(?=\n##|$)/);
  if (argsMatch) {
    const argsContent = argsMatch[1];
    const argMatches = argsContent.matchAll(/\*\s*`([^`]+)`\s*-\s*(?:\(([^)]+)\))?\s*(Required)?\s*(.*?)(?=\n\*|$)/g);
    
    for (const match of argMatches) {
      const arg = {
        name: match[1],
        type: match[2] || "string",
        description: match[4].trim()
      };
      
      if (match[3] === "Required") {
        args.required.push(arg);
      } else {
        args.optional.push(arg);
      }
    }
  }
  
  return args;
}

/**
 * Extract attributes from documentation content
 */
function extractAttributes(content: string) {
  const attributes = [] as any[];
  
  // Find the attributes section
  const attrsMatch = content.match(/## Attribute Reference\s*\n([\s\S]*?)(?=\n##|$)/);
  if (attrsMatch) {
    const attrsContent = attrsMatch[1];
    const attrMatches = attrsContent.matchAll(/\*\s*`([^`]+)`\s*-\s*(?:\(([^)]+)\))?\s*(.*?)(?=\n\*|$)/g);
    
    for (const match of attrMatches) {
      attributes.push({
        name: match[1],
        type: match[2] || "string",
        description: match[3].trim(),
        computed: true
      });
    }
  }
  
  return attributes;
}

/**
 * Extract nested blocks from documentation content
 */
function extractNestedBlocks(content: string) {
  const blocks = [] as any[];
  
  // Find nested block sections
  const blockMatches = content.matchAll(/### ([^\n]+) Configuration\s*\n([\s\S]*?)(?=\n###|$)/g);
  
  for (const match of blockMatches) {
    const blockName = match[1].toLowerCase();
    const blockContent = match[2];
    
    const args = [] as any[];
    const argMatches = blockContent.matchAll(/\*\s*`([^`]+)`\s*-\s*(?:\(([^)]+)\))?\s*(Required)?\s*(.*?)(?=\n\*|$)/g);
    
    for (const argMatch of argMatches) {
      args.push({
        name: argMatch[1],
        type: argMatch[2] || "string",
        description: argMatch[4].trim(),
        required: argMatch[3] === "Required"
      });
    }
    
    blocks.push({
      name: blockName,
      description: blockContent.split("\n")[0].trim(),
      arguments: args
    });
  }
  
  return blocks;
}

/**
 * Extract import instructions from documentation content
 */
function extractImportInstructions(content: string) {
  const importMatch = content.match(/## Import\s*\n([\s\S]*?)(?=\n##|$)/);
  if (importMatch) {
    const importContent = importMatch[1];
    const syntaxMatch = importContent.match(/```\s*([^\n]+)\s*```/);
    const examples = importContent.match(/(?<=```\n)[^`]+(?=\n```)/g) || [];
    
    return {
      syntax: syntaxMatch ? syntaxMatch[1] : "",
      examples: examples.map(e => e.trim())
    };
  }
  return undefined;
}

/**
 * Extract examples from documentation content
 */
function extractExamples(content: string) {
  const examples = [] as any[];
  
  // Find example sections
  const exampleMatches = content.matchAll(/### ([^\n]+)\s*\n([\s\S]*?)(?=\n###|$)/g);
  
  for (const match of exampleMatches) {
    const name = match[1];
    const exampleContent = match[2];
    const description = exampleContent.split("```")[0].trim();
    const codeMatch = exampleContent.match(/```(?:hcl|terraform)\s*([\s\S]*?)```/);
    
    if (codeMatch) {
      examples.push({
        name,
        description,
        code: codeMatch[1].trim()
      });
    }
  }
  
  return examples;
}

/**
 * Fetches documentation for a specific version of a resource
 */
export async function fetchVersionedDocumentation(
  namespace: string,
  provider: string,
  resource: string,
  version?: string
): Promise<any> {
  try {
    logger.debug(`Fetching documentation for ${namespace}/${provider}/${resource}`);

    // Get provider information including source repository
    const providerUrl = `${REGISTRY_API_BASE}/v2/providers/${namespace}/${provider}`;
    logger.debug(`Fetching provider info from: ${providerUrl}`);
    const providerResponse = await fetch(providerUrl);
    if (!providerResponse.ok) {
      throw new Error(`Failed to fetch provider info: ${providerResponse.status} ${providerResponse.statusText}`);
    }
    const providerData = await providerResponse.json();
    logger.debug("Provider data:", JSON.stringify(providerData, null, 2));

    // Get latest version ID if version not specified
    const versionsUrl = `${providerUrl}/versions`;
    logger.debug(`Fetching provider versions from: ${versionsUrl}`);
    const versionsResponse = await fetch(versionsUrl);
    if (!versionsResponse.ok) {
      throw new Error(`Failed to fetch provider versions: ${versionsResponse.status} ${versionsResponse.statusText}`);
    }
    const versionsData = await versionsResponse.json();
    logger.debug("Versions data:", JSON.stringify(versionsData, null, 2));

    if (!versionsData.data || versionsData.data.length === 0) {
      throw new Error("No provider versions found");
    }

    const latestVersion = versionsData.data[0].attributes.version;
    logger.debug(`Latest version: ${latestVersion}`);

    // Get documentation content from GitHub repository
    const sourceRepo = providerData.data.attributes.source || "hashicorp/terraform-provider-aws";
    const [owner, repo] = sourceRepo.split("/");
    const docUrl = `https://raw.githubusercontent.com/${owner}/${repo}/v${latestVersion}/docs/resources/${resource}.md`;
    logger.debug(`Fetching documentation from: ${docUrl}`);
    const docResponse = await fetch(docUrl);
    if (!docResponse.ok) {
      // Try alternative path
      const altDocUrl = `https://raw.githubusercontent.com/${owner}/${repo}/v${latestVersion}/website/docs/r/${resource}.html.markdown`;
      logger.debug(`Trying alternative URL: ${altDocUrl}`);
      const altDocResponse = await fetch(altDocUrl);
      if (!altDocResponse.ok) {
        logger.warn(`No documentation found for resource ${resource}, returning basic info`);
        const basicContent = `## Resource: ${resource}\n\nThis resource is provided by the **${namespace}/${provider}** provider.\n\n### Usage\n\nFor detailed information on this resource's arguments and attributes, please refer to the official documentation:\n\n**[View Full Documentation](${REGISTRY_API_BASE}/providers/${namespace}/${provider}/latest/docs/resources/${resource})**\n\n### Example Usage Pattern\n\n\`\`\`terraform\nresource "${resource}" "example" {\n  # Required arguments go here\n  # ...\n}\n\`\`\``;
        logger.debug("Returning basic content:", basicContent);
        return {
          content: basicContent,
          metadata: {
            resource,
            provider,
            namespace,
            documentationUrl: `${REGISTRY_API_BASE}/providers/${namespace}/${provider}/latest/docs/resources/${resource}`,
            context: {
              compatibility: {
                terraformCoreVersions: "Terraform 0.12 and later",
                lastUpdated: new Date().toISOString()
              }
            },
            timestamp: new Date().toISOString(),
            version: version || latestVersion,
            latestVersion
          }
        };
      }
      const content = await altDocResponse.text();
      logger.debug("Raw content from alternative URL:", content);
      return processDocContent(content, resource, provider, namespace, latestVersion);
    }

    const content = await docResponse.text();
    logger.debug("Raw content:", content);
    return processDocContent(content, resource, provider, namespace, latestVersion);
  } catch (error) {
    logger.error("Error fetching versioned documentation:", error);
    throw error;
  }
}

function processDocContent(
  content: string,
  resource: string,
  provider: string,
  namespace: string,
  version: string
): any {
  // Extract all components
  const args = extractArguments(content);
  logger.debug("Extracted arguments:", args);

  const attributes = extractAttributes(content);
  logger.debug("Extracted attributes:", attributes);

  const nestedBlocks = extractNestedBlocks(content);
  logger.debug("Extracted nested blocks:", nestedBlocks);

  const importInstructions = extractImportInstructions(content);
  logger.debug("Extracted import instructions:", importInstructions);

  const examples = extractExamples(content);
  logger.debug("Extracted examples:", examples);

  // Extract description (first paragraph before any headers)
  const description = content.split(/\n##/)[0].trim();
  logger.debug("Extracted description:", description);

  // Extract subcategory if present
  const subcategoryMatch = content.match(/Category:\s*([^\n]+)/);
  const subcategory = subcategoryMatch ? subcategoryMatch[1].trim() : "";
  logger.debug("Extracted subcategory:", subcategory);

  return {
    content,
    metadata: {
      resource,
      provider,
      namespace,
      documentationUrl: `${REGISTRY_API_BASE}/providers/${namespace}/${provider}/latest/docs/resources/${resource}`,
      description,
      subcategory,
      examples,
      arguments: args,
      attributes,
      nestedBlocks,
      importInstructions,
      context: {
        compatibility: {
          terraformCoreVersions: "Terraform 0.12 and later",
          lastUpdated: new Date().toISOString()
        }
      },
      timestamp: new Date().toISOString(),
      version,
      latestVersion: version
    }
  };
}