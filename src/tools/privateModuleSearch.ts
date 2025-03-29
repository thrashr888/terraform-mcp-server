import { ResponseContent, PrivateModuleSearchParams } from "../types/index.js";
import { searchPrivateModules } from "../utils/hcpApiUtils.js";
import { TFC_TOKEN } from "../../config.js";
import { createStandardResponse } from "../utils/responseUtils.js";
import logger from "../utils/logger.js";

interface ApiModule {
  id: string;
  attributes: {
    name: string;
    provider: string;
    status: string;
    "version-statuses": Array<{
      version: string;
      status: string;
    }>;
    "updated-at": string;
  };
}

export async function handlePrivateModuleSearch(params: PrivateModuleSearchParams): Promise<ResponseContent> {
  if (!TFC_TOKEN) {
    throw new Error("TFC_TOKEN environment variable is required for private module search");
  }

  try {
    logger.debug("Searching private modules", { params });

    const result = await searchPrivateModules(
      TFC_TOKEN,
      params.organization,
      params.query,
      params.provider,
      params.page,
      params.per_page
    );
    const modules = result.modules as unknown as ApiModule[];
    const { pagination } = result;

    // Format the search results into markdown
    let markdown = "## Private Modules Search Results\n\n";

    if (modules.length === 0) {
      markdown += "No modules found.\n";
    } else {
      markdown += `Found ${pagination?.total_count || modules.length} module(s)\n\n`;
      markdown += "| Name | Provider | Status | Latest Version |\n";
      markdown += "|------|----------|--------|----------------|\n";

      modules.forEach((module) => {
        const latestVersion = module.attributes["version-statuses"]?.[0]?.version || "N/A";
        markdown += `| ${module.attributes.name} | ${module.attributes.provider} | ${module.attributes.status} | ${latestVersion} |\n`;
      });

      if (pagination && pagination.total_pages > 1) {
        markdown += `\n*Page ${pagination.current_page} of ${pagination.total_pages}*`;
      }
    }

    return createStandardResponse("success", markdown, {
      modules: modules.map((module) => ({
        id: module.id,
        name: module.attributes.name,
        provider: module.attributes.provider,
        status: module.attributes.status,
        versions: module.attributes["version-statuses"],
        updated_at: module.attributes["updated-at"]
      })),
      pagination,
      context: {
        timestamp: new Date().toISOString(),
        organization: params.organization,
        query: params.query,
        provider: params.provider
      }
    });
  } catch (error) {
    logger.error("Error searching private modules:", error);
    throw error;
  }
}
