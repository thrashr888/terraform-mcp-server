import { ResponseContent } from "../types/index.js";
import { fetchWithAuth } from "../utils/hcpApiUtils.js";
import { TFC_TOKEN, TF_CLOUD_API_BASE } from "../../config.js";
import { createStandardResponse } from "../utils/responseUtils.js";
import { URLSearchParams } from "url";

export interface WorkspaceResourcesQueryParams {
  workspace_id: string;
  page_number?: number;
  page_size?: number;
}

interface WorkspaceResource {
  id: string;
  type: string;
  attributes: {
    name: string;
    provider: string;
    "provider-type"?: string;
    "module-address"?: string;
    "resource-type": string;
    mode: string;
    "module-path"?: string[];
    version?: string;
    "created-at": string;
    "updated-at": string;
  };
  relationships?: {
    state?: {
      data?: {
        id: string;
        type: string;
      };
    };
    workspace?: {
      data?: {
        id: string;
        type: string;
      };
    };
  };
}

export async function handleListWorkspaceResources(params: WorkspaceResourcesQueryParams): Promise<ResponseContent> {
  if (!TFC_TOKEN) {
    throw new Error("TFC_TOKEN environment variable is required for workspace resource operations");
  }

  const { workspace_id, page_number, page_size } = params;

  // Build query parameters
  const queryParams = new URLSearchParams();
  if (page_number) queryParams.append("page[number]", page_number.toString());
  if (page_size) queryParams.append("page[size]", page_size.toString());

  const response = await fetchWithAuth<WorkspaceResource[]>(
    `${TF_CLOUD_API_BASE}/workspaces/${workspace_id}/resources?${queryParams.toString()}`,
    TFC_TOKEN
  );

  // Format the response into a markdown table
  const resources = response.data.map((resource: WorkspaceResource) => ({
    id: resource.id,
    ...resource.attributes
  }));

  let markdown = `## Resources for Workspace: ${workspace_id}\n\n`;

  if (resources.length > 0) {
    // Create markdown table
    markdown += "| Name | Provider | Resource Type | Mode |\n";
    markdown += "|------|----------|---------------|------|\n";

    resources.forEach((resource: any) => {
      markdown += `| ${resource.name} | ${resource.provider} | ${resource["resource-type"]} | ${resource.mode} |\n`;
    });
  } else {
    markdown += "No resources found.";
  }

  return createStandardResponse("success", markdown, {
    resources,
    total: resources.length,
    context: {
      workspace_id,
      timestamp: new Date().toISOString()
    }
  });
}
