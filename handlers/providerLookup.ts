import { ProviderLookupInput, ResponseContent } from "../types/index.js";
import { createStandardResponse, formatAsMarkdown, formatUrl, addStandardContext } from "../utils/responseUtils.js";
import { fetchData, getProviderDocUrl } from "../utils/apiUtils.js";
import { handleToolError } from "../utils/responseUtils.js";
import { DEFAULT_NAMESPACE, REGISTRY_API_V1 } from "../config.js";
import logger from "../utils/logger.js";

/**
 * Handles the providerLookup tool request
 * @param params Input parameters for the provider lookup tool
 * @returns Standardized response with provider information
 */
export async function handleProviderLookup(params: ProviderLookupInput): Promise<ResponseContent> {
  try {
    logger.debug("Processing providerLookup request", params);
    
    // Extract and normalize parameters
    let providerStr = params.provider || "";
    let namespaceStr = params.namespace || DEFAULT_NAMESPACE;

    // Handle provider format with namespace/provider
    if (providerStr.includes("/")) {
      const [ns, prov] = providerStr.split("/");
      namespaceStr = ns;
      providerStr = prov || "";
    }
    
    // Validate required parameters
    if (!providerStr) {
      throw new Error("Provider name is required");
    }

    // Fetch provider data from the registry
    const url = `${REGISTRY_API_V1}/providers/${namespaceStr}/${providerStr}`;
    const data = await fetchData<any>(url);
    const versions = data.versions || [];
    
    if (versions.length === 0) {
      throw new Error(`No versions found for provider: ${namespaceStr}/${providerStr}`);
    }
    
    // Extract version information
    const latestVersionObj = versions[versions.length - 1];
    const latestVersion = latestVersionObj.version || latestVersionObj;
    const totalVersions = versions.length;
    
    // Format provider documentation URL
    const providerUrl = formatUrl(getProviderDocUrl(namespaceStr, providerStr));
    
    // Create a markdown response with usage example
    const markdownResponse = `## Provider: ${namespaceStr}/${providerStr}\n\n` +
      `**Latest Version**: ${latestVersion}\n\n` +
      `**Total Versions**: ${totalVersions}\n\n` +
      "### Usage Example\n\n" +
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

    logger.info(`Found provider ${namespaceStr}/${providerStr} with ${totalVersions} versions`);
    
    // Prepare metadata with context information
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
    
    // Add standard context information
    addStandardContext(metadata);
    
    return createStandardResponse("success", markdownResponse, metadata);
  } catch (error) {
    // Handle errors in a standardized way
    return handleToolError("providerLookup", error, {
      inputParams: params
    });
  }
}