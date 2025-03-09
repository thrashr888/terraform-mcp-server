import { ResourceDocumentationInput, ResponseContent } from "../types/index.js";
import { handleToolError, createStandardResponse, addStandardContext } from "../utils/responseUtils.js";
import { REGISTRY_API_BASE } from "../config.js";
import logger from "../utils/logger.js";

/**
 * Handles the resourceArgumentDetails tool request
 * @param params Input parameters for resource argument details
 * @returns Standardized response with resource argument details
 */
export async function handleResourceArgumentDetails(params: ResourceDocumentationInput): Promise<ResponseContent> {
  try {
    logger.debug("Processing resourceArgumentDetails request", params);

    // Validate required parameters
    if (!params.provider || !params.namespace || !params.resource) {
      throw new Error("Missing required parameters: provider, namespace, and resource are required");
    }

    // Log the raw parameters
    logger.info("Raw parameters:", params);

    // 1. Get provider versions
    const versionsUrl = `${REGISTRY_API_BASE}/v2/providers/${params.namespace}/${params.provider}?include=provider-versions`;
    logger.info("Fetching versions from:", versionsUrl);
    const versionsResponse = await fetch(versionsUrl);

    if (!versionsResponse.ok) {
      throw new Error(`Failed to fetch provider versions: ${versionsResponse.status} ${versionsResponse.statusText}`);
    }

    const versionsData = await versionsResponse.json();
    logger.info("Versions data structure:", {
      hasData: !!versionsData.data,
      hasIncluded: !!versionsData.included,
      includedLength: versionsData.included?.length,
      firstIncluded: versionsData.included?.[0],
      fullResponse: versionsData
    });

    if (!versionsData.included || versionsData.included.length === 0) {
      throw new Error(`No versions found for provider ${params.namespace}/${params.provider}`);
    }

    // Get latest version ID and published date from included data
    const versionId = versionsData.included[0].id;
    const publishedAt = versionsData.included[0].attributes["published-at"];
    const version = versionsData.included[0].attributes.version;
    logger.info("Using version ID:", versionId);
    logger.info("Published at:", publishedAt);
    logger.info("Version:", version);

    // 2. Get resource documentation ID
    const docIdUrl = `${REGISTRY_API_BASE}/v2/provider-docs?filter[provider-version]=${versionId}&filter[category]=resources&filter[slug]=${params.resource}&filter[language]=hcl&page[size]=1`;
    logger.info("Fetching doc ID from:", docIdUrl);
    const docIdResponse = await fetch(docIdUrl);

    if (!docIdResponse.ok) {
      throw new Error(`Failed to fetch documentation ID: ${docIdResponse.status} ${docIdResponse.statusText}`);
    }

    const docIdData = await docIdResponse.json();
    logger.info("Doc ID data:", docIdData);

    if (!docIdData.data || docIdData.data.length === 0) {
      throw new Error(
        `Documentation not found for resource ${params.resource} in provider ${params.namespace}/${params.provider}`
      );
    }

    const docId = docIdData.data[0].id;
    logger.info("Using doc ID:", docId);

    // 3. Get full documentation content
    const contentUrl = `${REGISTRY_API_BASE}/v2/provider-docs/${docId}`;
    logger.info("Fetching content from:", contentUrl);
    const contentResponse = await fetch(contentUrl);

    if (!contentResponse.ok) {
      throw new Error(`Failed to fetch documentation content: ${contentResponse.status} ${contentResponse.statusText}`);
    }

    const contentData = await contentResponse.json();
    logger.info("Content data:", contentData);

    if (!contentData.data?.attributes?.content) {
      throw new Error("Documentation content is empty or malformed");
    }

    const content = contentData.data.attributes.content;
    const documentationUrl = `${REGISTRY_API_BASE}/providers/${params.namespace}/${params.provider}/${version}/docs/resources/${params.resource}`;

    // Add metadata with version information and content structure
    const metadata = {
      provider: params.provider,
      namespace: params.namespace,
      resource: params.resource,
      version: {
        requested: params.version || "latest",
        current: version,
        publishedAt
      },
      documentationUrl,
      context: {
        compatibility: {
          terraformCoreVersions: "Terraform 0.12 and later",
          lastUpdated: publishedAt
        }
      }
    };

    // Add standard context
    addStandardContext(metadata);

    // Return structured content in metadata, but keep markdown for display
    const markdownContent = [
      `## ${metadata.resource}`,
      "",
      `This resource is provided by the **${metadata.namespace}/${metadata.provider}** provider version ${metadata.version.current}.`,
      "",
      "### Documentation",
      "",
      content,
      "",
      `**[View Full Documentation](${documentationUrl})**`,
      ""
    ].join("\n");

    return createStandardResponse("success", markdownContent, metadata);
  } catch (error) {
    // Enhanced error handling with more context
    return handleToolError("resourceArgumentDetails", error, {
      inputParams: params,
      context: {
        message: error instanceof Error ? error.message : "Unknown error occurred",
        timestamp: new Date().toISOString()
      }
    });
  }
}
