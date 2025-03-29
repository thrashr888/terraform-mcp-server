import { ALGOLIA_CONFIG } from "../../config.js";
import { searchAlgolia, formatModuleResults } from "../utils/searchUtils.js";
import { ModuleRecommendationsInput, ResponseContent } from "../types/index.js";
import logger from "../utils/logger.js";
import { createStandardResponse } from "../utils/responseUtils.js";

export async function handleModuleRecommendations(request: ModuleRecommendationsInput): Promise<ResponseContent> {
  try {
    const query = request.query || request.keyword || "";
    if (!query) {
      return createStandardResponse("error", "No search query provided");
    }

    const config = {
      applicationId: ALGOLIA_CONFIG.APPLICATION_ID,
      apiKey: ALGOLIA_CONFIG.API_KEY,
      indexName: ALGOLIA_CONFIG.MODULES_INDEX
    };

    const results = await searchAlgolia(config, query, request.provider);

    if (!results.hits || results.hits.length === 0) {
      return createStandardResponse("error", `No modules found for query "${query}"`);
    }

    const formattedResults = formatModuleResults(results.hits);

    // Create markdown content
    let content = `## Module Recommendations for "${query}"\n\n`;
    formattedResults.forEach((mod, i) => {
      content += `### ${i + 1}. ${mod.full_name}\n\n`;
      content += `**Description**: ${mod.description}\n`;
      content += `**Downloads**: ${mod.downloads?.toLocaleString() || 0}\n`;
      content += `**Latest Version**: ${mod.version}\n\n`;
      content += `\`\`\`hcl\nmodule "${mod.name}" {\n  source = "${mod.full_name}"\n  version = "${mod.version}"\n}\n\`\`\`\n\n`;
    });

    return createStandardResponse("success", content, { results: formattedResults });
  } catch (error) {
    logger.error("Error in module recommendations:", error);
    return createStandardResponse("error", error instanceof Error ? error.message : "Unknown error occurred");
  }
}
