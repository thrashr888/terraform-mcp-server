import { ResourceArgumentDetailsInput, ResponseContent } from '../types/index.js';
import { createStandardResponse, formatAsMarkdown, formatUrl, addStandardContext } from '../utils/responseUtils.js';
import { handleToolError } from '../utils/responseUtils.js';
import { getResourceDocUrl } from '../utils/apiUtils.js';
import logger from '../utils/logger.js';

/**
 * Handles the resourceArgumentDetails tool request
 * @param params Input parameters for resource argument details
 * @returns Standardized response with resource argument information
 */
export async function handleResourceArgumentDetails(params: ResourceArgumentDetailsInput): Promise<ResponseContent> {
  try {
    logger.debug('Processing resourceArgumentDetails request', params);
    
    // Extract and validate required parameters
    const { provider, namespace, resource } = params;
    if (!provider || !namespace || !resource) {
      throw new Error('Provider, namespace, and resource are required.');
    }

    logger.info(`Returning documentation link for ${namespace}/${provider}/resources/${resource}`);
    
    // Direct to documentation approach - the most reliable method
    const docUrl = formatUrl(getResourceDocUrl(namespace, provider, resource));
    
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
    addStandardContext(metadata);
    
    return createStandardResponse("success", markdownResponse, metadata);
  } catch (error) {
    return handleToolError('resourceArgumentDetails', error, {
      inputParams: params
    });
  }
}