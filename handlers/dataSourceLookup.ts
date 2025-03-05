import { DataSourceLookupInput, ResponseContent } from "../types/index.js";
import { createStandardResponse, formatAsMarkdown, formatUrl, addStandardContext } from "../utils/responseUtils.js";
import { handleToolError } from "../utils/responseUtils.js";
import { REGISTRY_API_BASE } from "../config.js";
import logger from "../utils/logger.js";

/**
 * Handles the dataSourceLookup tool request
 * @param params Input parameters for the data source lookup tool
 * @returns Standardized response with data source information
 */
export async function handleDataSourceLookup(params: DataSourceLookupInput): Promise<ResponseContent> {
  try {
    logger.debug("Processing dataSourceLookup request", params);
    
    // Extract parameters
    const { provider, namespace } = params;
    
    // Validate required parameters
    if (!provider || !namespace) {
      throw new Error("Both provider and namespace are required.");
    }

    logger.info(`Returning documentation link for ${namespace}/${provider} data sources`);
    
    // Direct to documentation approach - the most reliable method
    const docUrl = formatUrl(`${REGISTRY_API_BASE}/providers/${namespace}/${provider}/latest/docs/data-sources`);
    
    // Create a markdown formatted response
    const markdownResponse = `## Data Sources for Provider ${namespace}/${provider}\n\n` +
      "Data sources allow Terraform to use information defined outside of Terraform, defined by another separate Terraform configuration, or modified by functions.\n\n" +
      "### Usage Example\n\n" +
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
    addStandardContext(metadata);
    
    return createStandardResponse("success", markdownResponse, metadata);
  } catch (error) {
    return handleToolError("dataSourceLookup", error, {
      inputParams: params
    });
  }
}