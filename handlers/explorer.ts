import { ResponseContent } from "../types/index.js";
import { fetchWithAuth } from "../utils/hcpApiUtils.js";
import { TFC_TOKEN, TF_CLOUD_API_BASE } from "../config.js";
import { createStandardResponse } from "../utils/responseUtils.js";
import { URLSearchParams } from "url";

export interface ExplorerQueryParams {
  organization: string;
  type: "workspaces" | "tf_versions" | "providers" | "modules";
  sort?: string;
  filter?: Array<{
    field: string;
    operator: string;
    value: string[];
  }>;
  fields?: string[];
  page_number?: number;
  page_size?: number;
}

// Define an interface for the explorer item
interface ExplorerItem {
  attributes: Record<string, any>;
  [key: string]: any;
}

export async function handleExplorerQuery(params: ExplorerQueryParams): Promise<ResponseContent> {
  if (!TFC_TOKEN) {
    throw new Error("TFC_TOKEN environment variable is required for explorer queries");
  }

  const { organization, type, sort, filter, fields, page_number, page_size } = params;
  
  // Build query parameters
  const queryParams = new URLSearchParams();
  queryParams.append("type", type);
  
  if (sort) queryParams.append("sort", sort);
  if (fields) queryParams.append("fields", fields.join(","));
  if (page_number) queryParams.append("page[number]", page_number.toString());
  if (page_size) queryParams.append("page[size]", page_size.toString());
  if (filter) {
    queryParams.append("filter", JSON.stringify(filter));
  }

  const data = await fetchWithAuth<ExplorerItem[]>(
    `${TF_CLOUD_API_BASE}/organizations/${organization}/explorer?${queryParams.toString()}`,
    TFC_TOKEN
  );

  // Format the response into a markdown table
  const rows = data.data.map((item: ExplorerItem) => ({
    ...item.attributes
  }));

  let markdown = `## Explorer Query Results (${rows.length} total)\n\n`;

  if (rows.length > 0) {
    // Extract headers from the first row
    const headers = Object.keys(rows[0]);
    
    // Create markdown table header
    markdown += `| ${headers.join(" | ")} |\n`;
    markdown += `| ${headers.map(() => "---").join(" | ")} |\n`;

    // Add table rows
    rows.forEach((row: Record<string, any>) => {
      markdown += `| ${headers.map(h => row[h] || "-").join(" | ")} |\n`;
    });
  } else {
    markdown += "No results found.";
  }

  return createStandardResponse("success", markdown, {
    results: rows,
    total: rows.length,
    context: {
      organization,
      type,
      timestamp: new Date().toISOString()
    }
  });
} 