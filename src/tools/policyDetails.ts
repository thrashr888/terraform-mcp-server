import { REGISTRY_API_V2 } from "../../config.js";
import { PolicyDetailsInput, ResponseContent, PolicyDetails } from "../types/index.js";
import logger from "../utils/logger.js";
import { createStandardResponse } from "../utils/responseUtils.js";
import fetch from "node-fetch";

export async function handlePolicyDetails(request: PolicyDetailsInput): Promise<ResponseContent> {
  try {
    const { namespace, name } = request;

    // Fetch policy details
    const policyUrl = `${REGISTRY_API_V2}/policies/${namespace}/${name}?include=versions,categories,providers,latest-version`;
    const policyResponse = await fetch(policyUrl);

    if (!policyResponse.ok) {
      throw new Error(`Failed to fetch policy details: ${policyResponse.statusText}`);
    }

    const policyData = (await policyResponse.json()) as { data: PolicyDetails; included: any[] };
    logger.debug("Policy data:", JSON.stringify(policyData, null, 2));

    // Find latest version from included data
    const latestVersion = policyData.included?.find(
      (item) =>
        item.type === "policy-library-versions" && item.id === policyData.data.relationships["latest-version"].data.id
    );

    if (!latestVersion) {
      throw new Error("Latest version details not found in response");
    }

    // Create markdown content
    let content = `## Policy Details: ${policyData.data.attributes["full-name"]}\n\n`;

    // Basic information
    content += `**Title**: ${policyData.data.attributes.title || "N/A"}\n`;
    content += `**Owner**: ${policyData.data.attributes["owner-name"]}\n`;
    content += `**Downloads**: ${policyData.data.attributes.downloads.toLocaleString()}\n`;
    content += `**Verified**: ${policyData.data.attributes.verified ? "Yes" : "No"}\n`;
    content += `**Source**: ${policyData.data.attributes.source}\n\n`;

    // Latest version information
    content += `### Latest Version (${latestVersion.attributes.version})\n\n`;
    content += `**Description**: ${latestVersion.attributes.description || "No description available"}\n`;
    content += `**Published**: ${new Date(latestVersion.attributes["published-at"]).toLocaleDateString()}\n`;

    // Categories
    const categories = policyData.included
      ?.filter((item) => item.type === "categories")
      .map((cat) => cat.attributes.name);
    if (categories?.length) {
      content += `**Categories**: ${categories.join(", ")}\n`;
    }

    // Providers
    const providers = policyData.included
      ?.filter((item) => item.type === "providers")
      .map((prov) => prov.attributes.name);
    if (providers?.length) {
      content += `**Providers**: ${providers.join(", ")}\n`;
    }

    content += "\n";

    // Readme content if available
    if (latestVersion.attributes.readme) {
      content += `### Documentation\n\n${latestVersion.attributes.readme}\n\n`;
    }

    return createStandardResponse("success", content, {
      policy: policyData.data,
      version: latestVersion,
      categories,
      providers
    });
  } catch (error) {
    logger.error("Error in policy details:", error);
    return createStandardResponse("error", error instanceof Error ? error.message : "Unknown error occurred");
  }
}
