import { ALGOLIA_CONFIG } from "../config.js";
import { searchAlgolia } from "../utils/searchUtils.js";
import { PolicySearchInput, ResponseContent } from "../types/index.js";
import logger from "../utils/logger.js";
import { createStandardResponse } from "../utils/responseUtils.js";

export async function handlePolicySearch(request: PolicySearchInput): Promise<ResponseContent> {
  try {
    const query = request.query || "";
    if (!query) {
      return createStandardResponse("error", "No search query provided");
    }

    const config = {
      applicationId: ALGOLIA_CONFIG.APPLICATION_ID,
      apiKey: ALGOLIA_CONFIG.API_KEY,
      indexName: ALGOLIA_CONFIG.POLICIES_INDEX
    };

    const results = await searchAlgolia(config, query, request.provider);
    
    if (!results.hits || results.hits.length === 0) {
      return createStandardResponse("error", `No policies found for query "${query}"`);
    }

    // Create markdown content
    let content = `## Policy Library Results for "${query}"\n\n`;
    results.hits.forEach((hit, i) => {
      content += `### ${i + 1}. ${hit["full-name"]}\n\n`;
      content += `**Description**: ${hit.description || "No description available"}\n`;
      content += `**Provider**: ${hit.providers?.[0]?.name || "N/A"}\n`;
      content += `**Downloads**: ${hit["latest-version"]?.downloads?.toLocaleString() || 0}\n`;
      content += `**Latest Version**: ${hit["latest-version"]?.version || "N/A"}\n`;
      content += `**Published**: ${hit["latest-version"]?.["published-at"] ? 
        new Date(hit["latest-version"]["published-at"] * 1000).toLocaleDateString() : "N/A"}\n`;
      
      if (hit.example) {
        content += `\n**Example**:\n\`\`\`hcl\n${hit.example}\n\`\`\`\n`;
      }
      content += "\n";
    });

    return createStandardResponse("success", content, { results: results.hits });
  } catch (error) {
    logger.error("Error in policy search:", error);
    return createStandardResponse("error", error instanceof Error ? error.message : "Unknown error occurred");
  }
} 