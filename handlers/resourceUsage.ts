import { ResourceUsageInput, ResponseContent } from '../types/index.js';
import { createStandardResponse, formatAsMarkdown, formatUrl, addStandardContext } from '../utils/responseUtils.js';
import { fetchDocumentation, getResourceDocUrl } from '../utils/apiUtils.js';
import { handleToolError } from '../utils/responseUtils.js';
import { extractUsageFromApiContent, getResourceDescription, generateTemplateExample } from '../utils/contentUtils.js';
import logger from '../utils/logger.js';

/**
 * Handles the resourceUsage tool request
 * @param params Input parameters for resource usage
 * @returns Standardized response with resource usage example
 */
export async function handleResourceUsage(params: ResourceUsageInput): Promise<ResponseContent> {
  try {
    logger.debug('Processing resourceUsage request', params);
    
    // Extract resource parameters, handling either { provider, resource } or { name } format
    const resourceParams: ResourceUsageInput = {
      provider: params.provider,
      resource: params.resource || params.name,
    };

    // Validate required parameters
    if (!resourceParams.provider) {
      throw new Error('Provider parameter is required for resourceUsage');
    }
    if (!resourceParams.resource) {
      throw new Error('Resource parameter is required for resourceUsage');
    }

    // Try to get provider version info
    // (This is nice-to-have but we'll continue if it fails)
    let latestVersion = '';
    try {
      const providerUrl = `https://registry.terraform.io/v1/providers/${resourceParams.provider}`;
      const response = await fetch(providerUrl);
      if (response.ok) {
        const providerData = await response.json();
        latestVersion = providerData.version;
      }
    } catch (error) {
      logger.warn(`Error fetching provider info: ${error}`);
    }

    // URL for the documentation
    const resourceName = resourceParams.resource;
    const providerName = resourceParams.provider;
    const url = getResourceDocUrl('hashicorp', providerName, resourceName);

    // Create metadata for the response
    const metadata: Record<string, any> = {
      provider: providerName,
      resource: resourceName,
      latestVersion: latestVersion || 'unknown',
      documentationUrl: url
    };

    // First try to get content from the API
    const docResult = await fetchDocumentation(providerName, resourceName);

    // If we have documentation from the API
    if (docResult && docResult.content) {
      logger.info(`Successfully retrieved documentation for ${resourceName} from API`);
      
      // Extract example usage from the content
      const usageSnippet = extractUsageFromApiContent(docResult.content);
      
      // If we found an example usage, format it properly
      if (usageSnippet !== '') {
        const markdownResponse = `## ${resourceName} Example Usage\n\n` +
          formatAsMarkdown(usageSnippet) +
          `\n\n[View Full Documentation for ${resourceName}](${url})`;

        // Enhance metadata
        metadata.documentSource = 'api';
        metadata.docId = docResult.docId;
        
        // Add compatibility information
        addStandardContext(metadata);

        return createStandardResponse("success", markdownResponse, metadata);
      }
      
      // If no example but we have content, return the full markdown content
      const markdownResponse = `## ${resourceName} Documentation\n\n` +
        `${docResult.content}\n\n` +
        `[View Full Documentation for ${resourceName}](${url})`;
      
      metadata.documentSource = 'api';
      metadata.docId = docResult.docId;
      metadata.hasExampleUsage = false;
      
      return createStandardResponse("success", markdownResponse, metadata);
    }

    // Fall back to generating a template example if API failed
    const templateExample = generateTemplateExample(resourceName, providerName);
    const resourceDescription = getResourceDescription(resourceName, providerName);
    
    const content = `## ${resourceName} - Generated Example\n\n` +
      `> **Note**: No official example was found in the Terraform Registry. A generated template is provided below.\n\n` +
      `### Resource Purpose\n` +
      `${resourceDescription}\n\n` +
      `### Basic Usage Pattern\n` +
      formatAsMarkdown(templateExample) + 
      `\n\n### Important Notes\n` +
      `- This is a generated example and may not include all required attributes\n` +
      `- Always refer to the [official documentation](${url}) for complete details\n` +
      `- Test in a non-production environment before using in production\n\n` +
      `[View Full Documentation for ${resourceName}](${url})`;

    logger.info(`No content found for ${resourceName}. Providing a generated template.`);
    
    // Add metadata for the fallback response
    metadata.documentSource = 'generated';
    metadata.hasExampleUsage = false;
    
    // Add compatibility information
    addStandardContext(metadata);

    // Create a standard response with the fallback content
    return createStandardResponse("success", content, metadata);
  } catch (error) {
    return handleToolError('resourceUsage', error, {
      inputParams: params
    });
  }
}