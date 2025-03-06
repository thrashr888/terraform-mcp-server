import { ResourceUsageInput, ResponseContent } from "../types/index.js";
import { createStandardResponse, addStandardContext } from "../utils/responseUtils.js";
import { handleToolError } from "../utils/responseUtils.js";
import { REGISTRY_API_BASE } from "../config.js";
import logger from "../utils/logger.js";

interface Example {
  name: string;
  description: string;
  code: string;
  tags: string[];
  dependencies?: string[];
  variables?: {
    name: string;
    type: string;
    description: string;
  }[];
  outputs?: {
    name: string;
    description: string;
  }[];
}

interface CommonPattern {
  pattern: string;
  description: string;
  bestPractices: string[];
  caveats: string[];
  code: string;
}

interface Prerequisites {
  requiredProviders: string[];
  requiredResources: string[];
  permissions: string[];
  limitations: string[];
}

interface TroubleshootingItem {
  problem: string;
  cause: string;
  solution: string;
  code?: string;
}

/**
 * Extract example blocks from markdown content with enhanced metadata
 */
function extractExamples(content: string): Example[] {
  const examples: Example[] = [];
  const exampleMatches = content.matchAll(/### ([^\n]+)\n\n(.*?)```(?:hcl|terraform)?\n([\s\S]*?)```/g);
  
  for (const match of exampleMatches) {
    const name = match[1].trim();
    const description = match[2].trim();
    const code = match[3].trim();
    
    // Extract tags from description or name
    const tags = extractTags(description);
    
    // Extract dependencies from code
    const dependencies = extractDependencies(code);
    
    // Extract variables and outputs
    const variables = extractVariables(code);
    const outputs = extractOutputs(code);
    
    examples.push({
      name,
      description,
      code,
      tags,
      dependencies,
      variables,
      outputs
    });
  }
  
  return examples;
}

/**
 * Extract tags from text based on common patterns and keywords
 */
function extractTags(text: string): string[] {
  const tags: Set<string> = new Set();
  
  // Common configuration patterns
  if (text.toLowerCase().includes("encryption")) tags.add("encryption");
  if (text.toLowerCase().includes("backup")) tags.add("backup");
  if (text.toLowerCase().includes("global")) tags.add("global-tables");
  if (text.toLowerCase().includes("autoscal")) tags.add("autoscaling");
  if (text.toLowerCase().includes("basic")) tags.add("basic");
  if (text.toLowerCase().includes("advanced")) tags.add("advanced");
  
  return Array.from(tags);
}

/**
 * Extract dependencies from HCL code
 */
function extractDependencies(code: string): string[] {
  const dependencies: Set<string> = new Set();
  const resourceMatches = code.matchAll(/resource\s+"([^"]+)"/g);
  
  for (const match of resourceMatches) {
    dependencies.add(match[1]);
  }
  
  return Array.from(dependencies);
}

/**
 * Extract variables from HCL code
 */
function extractVariables(code: string): { name: string; type: string; description: string; }[] {
  const variables: { name: string; type: string; description: string; }[] = [];
  const varMatches = code.matchAll(/variable\s+"([^"]+)"\s*{([^}]+)}/g);
  
  for (const match of varMatches) {
    const name = match[1];
    const block = match[2];
    const type = block.match(/type\s*=\s*([^\n]+)/)?.[1] || "string";
    const description = block.match(/description\s*=\s*"([^"]+)"/)?.[1] || "";
    
    variables.push({ name, type, description });
  }
  
  return variables;
}

/**
 * Extract outputs from HCL code
 */
function extractOutputs(code: string): { name: string; description: string; }[] {
  const outputs: { name: string; description: string; }[] = [];
  const outputMatches = code.matchAll(/output\s+"([^"]+)"\s*{([^}]+)}/g);
  
  for (const match of outputMatches) {
    const name = match[1];
    const block = match[2];
    const description = block.match(/description\s*=\s*"([^"]+)"/)?.[1] || "";
    
    outputs.push({ name, description });
  }
  
  return outputs;
}

/**
 * Extract common patterns from markdown content
 */
function extractCommonPatterns(content: string): CommonPattern[] {
  const patterns: CommonPattern[] = [];
  
  // Look for sections that describe common patterns
  const patternMatches = content.matchAll(/## ([^\n]+Pattern[^\n]*)\n\n(.*?)(?=\n##|$)/gs);
  
  for (const match of patternMatches) {
    const pattern = match[1].trim();
    const section = match[2];
    
    // Extract description
    const description = section.match(/(?:^|\n\n)([^#\n].+?)(?=\n\n|$)/)?.[1] || "";
    
    // Extract best practices
    const bestPractices = extractListItems(section, "Best Practices");
    
    // Extract caveats
    const caveats = extractListItems(section, "Caveats");
    
    // Extract code example
    const code = section.match(/```(?:hcl|terraform)?\n([\s\S]*?)```/)?.[1] || "";
    
    patterns.push({
      pattern,
      description,
      bestPractices,
      caveats,
      code
    });
  }
  
  return patterns;
}

/**
 * Extract prerequisites from markdown content
 */
function extractPrerequisites(content: string): Prerequisites {
  const prerequisites: Prerequisites = {
    requiredProviders: [],
    requiredResources: [],
    permissions: [],
    limitations: []
  };
  
  // Extract required providers
  const providerMatches = content.matchAll(/required_providers\s*{([^}]+)}/g);
  for (const match of providerMatches) {
    const providers = match[1].match(/[a-zA-Z0-9_-]+\s*=/g) || [];
    prerequisites.requiredProviders = providers.map(p => p.replace(/\s*=$/, ""));
  }
  
  // Extract required resources from examples
  const resourceMatches = content.matchAll(/resource\s+"([^"]+)"/g);
  for (const match of resourceMatches) {
    prerequisites.requiredResources.push(match[1]);
  }
  
  // Extract permissions from notes or requirements sections
  const permissionSection = content.match(/(?:##\s*Permissions|##\s*IAM[^\n]*)\n\n(.*?)(?=\n##|$)/s);
  if (permissionSection) {
    prerequisites.permissions = extractListItems(permissionSection[1]);
  }
  
  // Extract limitations from notes or limitations sections
  const limitationSection = content.match(/(?:##\s*Limitations|##\s*Restrictions)[^\n]*\n\n(.*?)(?=\n##|$)/s);
  if (limitationSection) {
    prerequisites.limitations = extractListItems(limitationSection[1]);
  }
  
  return prerequisites;
}

/**
 * Extract troubleshooting items from markdown content
 */
function extractTroubleshooting(content: string): TroubleshootingItem[] {
  const items: TroubleshootingItem[] = [];
  
  // Look for troubleshooting or common issues sections
  const troubleshootingSection = content.match(/##\s*(?:Troubleshooting|Common Issues)[^\n]*\n\n(.*?)(?=\n##|$)/s);
  if (!troubleshootingSection) return items;
  
  const section = troubleshootingSection[1];
  const problemMatches = section.matchAll(/###\s*([^\n]+)\n\n(.*?)(?=\n###|$)/gs);
  
  for (const match of problemMatches) {
    const problem = match[1].trim();
    const details = match[2];
    
    // Extract cause and solution
    const cause = details.match(/(?:Cause|Why):\s*([^\n]+)/)?.[1] || "";
    const solution = details.match(/(?:Solution|Fix|Resolution):\s*([^\n]+)/)?.[1] || "";
    
    // Extract code example if present
    const code = details.match(/```(?:hcl|terraform)?\n([\s\S]*?)```/)?.[1];
    
    items.push({
      problem,
      cause,
      solution,
      code
    });
  }
  
  return items;
}

/**
 * Helper function to extract list items from a section
 */
function extractListItems(content: string, sectionTitle?: string): string[] {
  if (sectionTitle) {
    const section = content.match(new RegExp(`${sectionTitle}[^\n]*\n\n(.*?)(?=\n##|$)`, "s"));
    if (!section) return [];
    content = section[1];
  }
  
  const items = content.match(/[-*]\s+([^\n]+)/g) || [];
  return items.map(item => item.replace(/^[-*]\s+/, "").trim());
}

/**
 * Extract notes from markdown content
 */
function extractNotes(content: string): string[] {
  const notes: string[] = [];
  const noteMatches = content.matchAll(/>\s*\*\*Note:\*\*\s*(.*?)(?=\n\n|\n>|\n#|$)/gs);
  
  for (const match of noteMatches) {
    notes.push(match[1].trim());
  }
  
  return notes;
}

/**
 * Extract import instructions from markdown content
 */
function extractImportInstructions(content: string): string {
  const importSection = content.match(/## Import\n\n([\s\S]*?)(?=\n##|$)/)?.[1] || "";
  return importSection.trim();
}

/**
 * Extract related documentation links from markdown content
 */
function extractRelatedDocs(content: string): Array<{ title: string; url: string }> {
  const relatedDocs: Array<{ title: string; url: string }> = [];
  const linkMatches = content.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g);
  
  for (const match of linkMatches) {
    const title = match[1];
    const url = match[2];
    // Only include external links and exclude section links
    if (url.startsWith("http") && !url.includes("#")) {
      relatedDocs.push({ title, url });
    }
  }
  
  return relatedDocs;
}

/**
 * Extract subcategory from markdown content
 */
function extractSubcategory(content: string): string {
  return content.match(/subcategory: "([^"]+)"/)?.[1] || "";
}

/**
 * Extract description from markdown content
 */
function extractDescription(content: string): string {
  return content.match(/description: \|-\n(.*?)\n---/s)?.[1]?.trim() || "";
}

/**
 * Handles the resourceUsage tool request
 * @param params Input parameters for resource usage
 * @returns Standardized response with resource usage example
 */
export async function handleResourceUsage(params: ResourceUsageInput): Promise<ResponseContent> {
  try {
    logger.debug("Processing resourceUsage request", params);
    
    // Extract resource parameters, handling either { provider, resource } or { name } format
    const resourceParams: ResourceUsageInput = {
      provider: params.provider,
      resource: params.resource || params.name,
    };

    // Validate required parameters
    if (!resourceParams.provider) {
      throw new Error("Provider parameter is required for resourceUsage");
    }
    if (!resourceParams.resource) {
      throw new Error("Resource parameter is required for resourceUsage");
    }

    // 1. Get provider versions
    const versionsUrl = `${REGISTRY_API_BASE}/v2/providers/hashicorp/${resourceParams.provider}?include=provider-versions`;
    logger.info("Fetching versions from:", versionsUrl);
    const versionsResponse = await fetch(versionsUrl);
    
    if (!versionsResponse.ok) {
      throw new Error(`Failed to fetch provider versions: ${versionsResponse.status} ${versionsResponse.statusText}`);
    }

    const versionsData = await versionsResponse.json();
    logger.debug("Versions response:", versionsData);
    
    if (!versionsData.included || versionsData.included.length === 0) {
      throw new Error(`No versions found for provider hashicorp/${resourceParams.provider}`);
    }

    // Get latest version ID and published date
    const versionId = versionsData.included[0].id;
    const publishedAt = versionsData.included[0].attributes["published-at"];
    const version = versionsData.included[0].attributes.version;
    
    logger.info("Using version:", { versionId, version, publishedAt });

    // 2. Get resource documentation ID
    // Updated URL construction to use the correct format
    const docIdUrl = `${REGISTRY_API_BASE}/v2/provider-docs?filter[provider-version]=${versionId}&filter[category]=resources&filter[slug]=${resourceParams.resource}&filter[language]=hcl&page[size]=1`;
    logger.info("Fetching doc ID from:", docIdUrl);
    const docIdResponse = await fetch(docIdUrl);

    if (!docIdResponse.ok) {
      logger.error("Failed to fetch documentation:", {
        status: docIdResponse.status,
        statusText: docIdResponse.statusText,
        url: docIdUrl
      });
      throw new Error(`Failed to fetch documentation ID: ${docIdResponse.status} ${docIdResponse.statusText}`);
    }

    const docIdData = await docIdResponse.json();
    logger.debug("Documentation response:", docIdData);

    if (!docIdData.data || docIdData.data.length === 0) {
      throw new Error(`Documentation not found for resource ${resourceParams.resource}`);
    }

    const docId = docIdData.data[0].id;
    logger.info("Found documentation ID:", docId);

    // 3. Get full documentation content
    const contentUrl = `${REGISTRY_API_BASE}/v2/provider-docs/${docId}`;
    logger.info("Fetching content from:", contentUrl);
    const contentResponse = await fetch(contentUrl);

    if (!contentResponse.ok) {
      logger.error("Failed to fetch content:", {
        status: contentResponse.status,
        statusText: contentResponse.statusText,
        url: contentUrl
      });
      throw new Error(`Failed to fetch documentation content: ${contentResponse.status} ${contentResponse.statusText}`);
    }

    const contentData = await contentResponse.json();
    logger.debug("Content response:", contentData);

    if (!contentData.data?.attributes?.content) {
      throw new Error("Documentation content is empty or malformed");
    }

    const content = contentData.data.attributes.content;
    const documentationUrl = `${REGISTRY_API_BASE}/providers/hashicorp/${resourceParams.provider}/${version}/docs/resources/${resourceParams.resource}`;

    // Extract all documentation components with enhanced metadata
    const description = extractDescription(content);
    const subcategory = extractSubcategory(content);
    const notes = extractNotes(content);
    const examples = extractExamples(content);
    const patterns = extractCommonPatterns(content);
    const prerequisites = extractPrerequisites(content);
    const troubleshooting = extractTroubleshooting(content);
    const importInstructions = extractImportInstructions(content);
    const relatedDocs = extractRelatedDocs(content);

    // Format the response in markdown with enhanced sections
    let markdownResponse = `## ${resourceParams.resource}\n\n`;
    markdownResponse += `This resource is provided by the **hashicorp/${resourceParams.provider}** provider version ${version}.\n\n`;

    if (description) {
      markdownResponse += `${description}\n\n`;
    }

    if (subcategory) {
      markdownResponse += `**Category**: ${subcategory}\n\n`;
    }

    // Add prerequisites section
    if (prerequisites.requiredProviders.length > 0 || prerequisites.requiredResources.length > 0) {
      markdownResponse += "## Prerequisites\n\n";
      
      if (prerequisites.requiredProviders.length > 0) {
        markdownResponse += "### Required Providers\n\n";
        prerequisites.requiredProviders.forEach(provider => {
          markdownResponse += `* ${provider}\n`;
        });
        markdownResponse += "\n";
      }
      
      if (prerequisites.requiredResources.length > 0) {
        markdownResponse += "### Required Resources\n\n";
        prerequisites.requiredResources.forEach(resource => {
          markdownResponse += `* ${resource}\n`;
        });
        markdownResponse += "\n";
      }
      
      if (prerequisites.permissions.length > 0) {
        markdownResponse += "### Required Permissions\n\n";
        prerequisites.permissions.forEach(permission => {
          markdownResponse += `* ${permission}\n`;
        });
        markdownResponse += "\n";
      }
      
      if (prerequisites.limitations.length > 0) {
        markdownResponse += "### Limitations\n\n";
        prerequisites.limitations.forEach(limitation => {
          markdownResponse += `* ${limitation}\n`;
        });
        markdownResponse += "\n";
      }
    }

    if (notes.length > 0) {
      markdownResponse += "## Important Notes\n\n";
      for (const note of notes) {
        markdownResponse += `> **Note**: ${note}\n\n`;
      }
    }

    if (examples.length > 0) {
      markdownResponse += "## Examples\n\n";
      for (const example of examples) {
        markdownResponse += `### ${example.name}\n\n`;
        
        if (example.tags.length > 0) {
          markdownResponse += `**Tags**: ${example.tags.join(", ")}\n\n`;
        }
        
        if (example.description) {
          markdownResponse += `${example.description}\n\n`;
        }
        
        if (example.dependencies?.length) {
          markdownResponse += "**Dependencies**:\n";
          example.dependencies.forEach(dep => {
            markdownResponse += `* ${dep}\n`;
          });
          markdownResponse += "\n";
        }
        
        if (example.variables?.length) {
          markdownResponse += "**Variables**:\n";
          example.variables.forEach(v => {
            markdownResponse += `* \`${v.name}\` (${v.type}): ${v.description}\n`;
          });
          markdownResponse += "\n";
        }
        
        markdownResponse += "```hcl\n" + example.code + "\n```\n\n";
        
        if (example.outputs?.length) {
          markdownResponse += "**Outputs**:\n";
          example.outputs.forEach(o => {
            markdownResponse += `* \`${o.name}\`: ${o.description}\n`;
          });
          markdownResponse += "\n";
        }
      }
    }

    if (patterns.length > 0) {
      markdownResponse += "## Common Patterns\n\n";
      for (const pattern of patterns) {
        markdownResponse += `### ${pattern.pattern}\n\n`;
        markdownResponse += `${pattern.description}\n\n`;
        
        if (pattern.bestPractices.length > 0) {
          markdownResponse += "**Best Practices**:\n";
          pattern.bestPractices.forEach(practice => {
            markdownResponse += `* ${practice}\n`;
          });
          markdownResponse += "\n";
        }
        
        if (pattern.caveats.length > 0) {
          markdownResponse += "**Caveats**:\n";
          pattern.caveats.forEach(caveat => {
            markdownResponse += `* ${caveat}\n`;
          });
          markdownResponse += "\n";
        }
        
        if (pattern.code) {
          markdownResponse += "```hcl\n" + pattern.code + "\n```\n\n";
        }
      }
    }

    if (troubleshooting.length > 0) {
      markdownResponse += "## Troubleshooting\n\n";
      for (const item of troubleshooting) {
        markdownResponse += `### ${item.problem}\n\n`;
        markdownResponse += `**Cause**: ${item.cause}\n\n`;
        markdownResponse += `**Solution**: ${item.solution}\n\n`;
        
        if (item.code) {
          markdownResponse += "```hcl\n" + item.code + "\n```\n\n";
        }
      }
    }

    if (importInstructions) {
      markdownResponse += "## Import\n\n";
      markdownResponse += `${importInstructions}\n\n`;
    }

    if (relatedDocs.length > 0) {
      markdownResponse += "## Related Documentation\n\n";
      for (const doc of relatedDocs) {
        markdownResponse += `* [${doc.title}](${doc.url})\n`;
      }
      markdownResponse += "\n";
    }

    // Add documentation link
    markdownResponse += `\n**[View Full Documentation](${documentationUrl})**\n`;

    // Prepare metadata with enhanced information
    const metadata = {
      provider: resourceParams.provider,
      namespace: "hashicorp",
      resource: resourceParams.resource,
      version: {
        current: version,
        publishedAt
      },
      documentationUrl,
      description,
      subcategory,
      examples: examples.map(e => ({
        name: e.name,
        tags: e.tags,
        dependencies: e.dependencies,
        variables: e.variables?.map(v => v.name),
        outputs: e.outputs?.map(o => o.name)
      })),
      patterns: patterns.map(p => ({
        pattern: p.pattern,
        bestPractices: p.bestPractices.length,
        caveats: p.caveats.length
      })),
      prerequisites: {
        providers: prerequisites.requiredProviders,
        resources: prerequisites.requiredResources,
        hasPermissions: prerequisites.permissions.length > 0,
        hasLimitations: prerequisites.limitations.length > 0
      },
      troubleshooting: troubleshooting.map(t => ({
        problem: t.problem,
        hasSolution: !!t.solution
      })),
      notes,
      import_instructions: importInstructions,
      related_docs: relatedDocs,
      context: {
        compatibility: {
          terraformCoreVersions: "Terraform 0.12 and later",
          lastUpdated: publishedAt
        }
      }
    };

    // Add standard context
    addStandardContext(metadata);

    return createStandardResponse("success", markdownResponse, metadata);
  } catch (error) {
    return handleToolError("resourceUsage", error, {
      inputParams: params
    });
  }
}