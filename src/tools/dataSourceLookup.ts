import { DataSourceLookupInput, ResponseContent } from "../types/index.js";
import { createStandardResponse, formatAsMarkdown, addStandardContext } from "../utils/responseUtils.js";
import { handleToolError } from "../utils/responseUtils.js";
import { REGISTRY_API_BASE } from "../../config.js";
import logger from "../utils/logger.js";

interface DataSource {
  name: string;
  category: string;
  description: string;
  example?: string;
  documentationUrl: string;
}

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

    // 1. Get provider versions
    const versionsUrl = `${REGISTRY_API_BASE}/v2/providers/${namespace}/${provider}?include=provider-versions`;
    logger.info("Fetching versions from:", versionsUrl);
    const versionsResponse = await fetch(versionsUrl);

    if (!versionsResponse.ok) {
      throw new Error(`Failed to fetch provider versions: ${versionsResponse.status} ${versionsResponse.statusText}`);
    }

    const versionsData = await versionsResponse.json();
    logger.debug("Versions response:", versionsData);

    if (!versionsData.included || versionsData.included.length === 0) {
      throw new Error(`No versions found for provider ${namespace}/${provider}`);
    }

    // Get latest version ID and published date
    const versionId = versionsData.included[0].id;
    const publishedAt = versionsData.included[0].attributes["published-at"];
    const version = versionsData.included[0].attributes.version;

    logger.info("Using version:", { versionId, version, publishedAt });

    // 2. Get data sources list
    const docIdUrl = `${REGISTRY_API_BASE}/v2/provider-docs?filter%5Bprovider-version%5D=${versionId}&filter%5Bcategory%5D=data-sources&filter%5Blanguage%5D=hcl&page%5Bsize%5D=100`;
    logger.info("Fetching doc IDs from:", docIdUrl);
    const docIdResponse = await fetch(docIdUrl);

    if (!docIdResponse.ok) {
      logger.error("Failed to fetch documentation:", {
        status: docIdResponse.status,
        statusText: docIdResponse.statusText,
        url: docIdUrl
      });
      throw new Error(`Failed to fetch documentation IDs: ${docIdResponse.status} ${docIdResponse.statusText}`);
    }

    const docIdData = await docIdResponse.json();
    logger.debug("Documentation response:", docIdData);

    if (!docIdData.data || docIdData.data.length === 0) {
      throw new Error(`No data sources found for provider ${namespace}/${provider}`);
    }

    const docId = docIdData.data[0].id;
    logger.info("Using doc ID:", docId);

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

    // Extract category from content or default to "Other"
    const categoryMatch = content.match(/subcategory:\s*"([^"]+)"/);
    const category = categoryMatch ? categoryMatch[1] : "Other";

    // Extract description
    const descriptionMatch = content.match(/description:\s*\|-\n(.*?)\n---/s);
    const description = descriptionMatch ? descriptionMatch[1].trim() : "";

    // Extract example
    const exampleMatch = content.match(/### Example Usage\n\n```(?:hcl|terraform)?\n([\s\S]*?)```/);
    const example = exampleMatch ? exampleMatch[1].trim() : undefined;

    const dataSource: DataSource = {
      name: contentData.data.attributes.title.replace("data_source_", ""),
      category,
      description,
      example,
      documentationUrl: `${REGISTRY_API_BASE}/providers/${namespace}/${provider}/${version}/docs/data-sources/${contentData.data.attributes.title}`
    };

    // Format the response in markdown
    let markdownResponse = `# Data Source: ${dataSource.name}\n\n`;
    markdownResponse += `This data source is provided by the **${namespace}/${provider}** provider version ${version}.\n\n`;

    if (description) {
      markdownResponse += `${description}\n\n`;
    }

    if (category) {
      markdownResponse += `**Category**: ${category}\n\n`;
      if (getCategoryDescription(category)) {
        markdownResponse += `${getCategoryDescription(category)}\n\n`;
      }
    }

    if (example) {
      markdownResponse += "## Example Usage\n\n```hcl\n" + example + "\n```\n\n";
    }

    // Add general usage example
    markdownResponse += "## General Usage Pattern\n\n";
    markdownResponse += formatAsMarkdown(`data "<data_source_name>" "example" {
  # Required arguments go here
  # ...
}

# Reference the data source
output "example_output" {
  value = data.<data_source_name>.example.<attribute>
}`);

    // Add metadata with context
    const metadata = {
      provider,
      namespace,
      version: {
        current: version,
        publishedAt
      },
      dataSource: {
        name: dataSource.name,
        category,
        hasExample: !!example
      },
      documentationUrl: dataSource.documentationUrl
    };

    // Add compatibility information
    addStandardContext(metadata);

    return createStandardResponse("success", markdownResponse, metadata);
  } catch (error) {
    return handleToolError("dataSourceLookup", error, {
      inputParams: params,
      context: {
        message: error instanceof Error ? error.message : "Unknown error occurred",
        timestamp: new Date().toISOString()
      }
    });
  }
}

/**
 * Get a description for a category
 */
function getCategoryDescription(category: string): string {
  const descriptions: { [key: string]: string } = {
    ACM: "AWS Certificate Manager - Manage SSL/TLS certificates",
    "API Gateway": "Manage Amazon API Gateway resources",
    CloudWatch: "Monitor AWS resources and applications",
    EC2: "Amazon Elastic Compute Cloud - Virtual servers in the cloud",
    ECS: "Amazon Elastic Container Service - Run and manage containers",
    IAM: "Identity and Access Management - Manage user access and encryption keys",
    Lambda: "Run code without thinking about servers",
    RDS: "Relational Database Service - Manage relational databases",
    S3: "Simple Storage Service - Scalable storage in the cloud",
    VPC: "Virtual Private Cloud - Isolated cloud resources",
    Other: "Additional data sources for various AWS services"
  };

  return descriptions[category] || "";
}
