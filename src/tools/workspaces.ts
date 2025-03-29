import { ResponseContent } from "../types/index.js";
import { fetchWithAuth } from "../utils/hcpApiUtils.js";
import { TFC_TOKEN, TF_CLOUD_API_BASE } from "../../config.js";
import { createStandardResponse } from "../utils/responseUtils.js";
import { URLSearchParams } from "url";

export interface WorkspacesQueryParams {
  organization: string;
  page_number?: number;
  page_size?: number;
  search?: string;
}

export interface WorkspaceActionParams {
  workspace_id: string;
  reason?: string;
}

interface Workspace {
  id: string;
  type: string;
  attributes: {
    name: string;
    description: string | null;
    "auto-apply": boolean;
    "terraform-version": string;
    "working-directory": string | null;
    "created-at": string;
    "updated-at": string;
    "resource-count": number;
    permissions: Record<string, boolean>;
    actions: Record<string, boolean>;
    "vcs-repo"?: {
      identifier: string;
      "oauth-token-id": string;
      branch: string;
    };
    [key: string]: any;
  };
  relationships?: Record<string, any>;
  links?: Record<string, any>;
}

export async function handleListWorkspaces(params: WorkspacesQueryParams): Promise<ResponseContent> {
  if (!TFC_TOKEN) {
    throw new Error("TFC_TOKEN environment variable is required for workspace operations");
  }

  const { organization, page_number, page_size, search } = params;

  if (!organization) {
    return createStandardResponse("error", "Missing required parameter: organization", {
      error: "Missing required parameter: organization"
    });
  }

  // Build query parameters
  const queryParams = new URLSearchParams();
  if (page_number) queryParams.append("page[number]", page_number.toString());
  if (page_size) queryParams.append("page[size]", page_size.toString());
  if (search) queryParams.append("search", search);

  try {
    const response = await fetchWithAuth<Workspace[]>(
      `${TF_CLOUD_API_BASE}/organizations/${organization}/workspaces${queryParams.toString() ? `?${queryParams.toString()}` : ""}`,
      TFC_TOKEN
    );

    // Format the response into a markdown table
    const workspaces = response.data.map((workspace: Workspace) => ({
      id: workspace.id,
      ...workspace.attributes
    }));

    let markdown = `## Workspaces in Organization: ${organization}\n\n`;

    if (workspaces.length > 0) {
      // Create markdown table
      markdown += "| Name | Terraform Version | Auto Apply | Resources | Updated At |\n";
      markdown += "|------|------------------|------------|-----------|------------|\n";

      workspaces.forEach((workspace: any) => {
        markdown += `| ${workspace.name} | ${workspace["terraform-version"]} | ${
          workspace["auto-apply"] ? "Yes" : "No"
        } | ${workspace["resource-count"]} | ${workspace["updated-at"]} |\n`;
      });
    } else {
      markdown += "No workspaces found in this organization.";
    }

    return createStandardResponse("success", markdown, {
      workspaces,
      total: workspaces.length,
      context: {
        organization: organization,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    // Provide a more helpful error message
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createStandardResponse("error", `Error listing workspaces: ${errorMessage}`, {
      error: errorMessage,
      context: {
        organization: organization
      }
    });
  }
}

export async function handleShowWorkspace(params: {
  organization_name: string;
  name: string;
}): Promise<ResponseContent> {
  if (!TFC_TOKEN) {
    throw new Error("TFC_TOKEN environment variable is required for workspace operations");
  }

  const { organization_name, name } = params;

  const response = await fetchWithAuth<Workspace>(
    `${TF_CLOUD_API_BASE}/organizations/${organization_name}/workspaces/${name}`,
    TFC_TOKEN
  );

  const workspace = {
    id: response.data.id,
    ...response.data.attributes
  };

  let markdown = `## Workspace: ${workspace.name}\n\n`;
  markdown += `**ID**: ${workspace.id}\n`;
  markdown += `**Terraform Version**: ${workspace["terraform-version"] || "Default"}\n`;
  markdown += `**Auto Apply**: ${workspace["auto-apply"] ? "Yes" : "No"}\n`;
  markdown += `**Working Directory**: ${workspace["working-directory"] || "/"}\n`;
  markdown += `**Updated At**: ${workspace["updated-at"]}\n`;

  if (workspace.description) {
    markdown += `\n### Description\n\n${workspace.description}\n`;
  }

  return createStandardResponse("success", markdown, {
    workspace,
    context: {
      organization: organization_name,
      timestamp: new Date().toISOString()
    }
  });
}

export async function handleLockWorkspace(params: WorkspaceActionParams): Promise<ResponseContent> {
  if (!TFC_TOKEN) {
    throw new Error("TFC_TOKEN environment variable is required for workspace operations");
  }

  const { workspace_id, reason } = params;

  const payload = {
    reason: reason || "Locked via API"
  };

  await fetchWithAuth(`${TF_CLOUD_API_BASE}/workspaces/${workspace_id}/actions/lock`, TFC_TOKEN, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/vnd.api+json"
    }
  });

  let markdown = `## Workspace Locked\n\n`;
  markdown += `Workspace with ID \`${workspace_id}\` has been locked.\n`;
  if (reason) {
    markdown += `\n**Reason**: ${reason}\n`;
  }

  return createStandardResponse("success", markdown, {
    workspace_id,
    locked: true,
    reason,
    timestamp: new Date().toISOString()
  });
}

export async function handleUnlockWorkspace(params: WorkspaceActionParams): Promise<ResponseContent> {
  if (!TFC_TOKEN) {
    throw new Error("TFC_TOKEN environment variable is required for workspace operations");
  }

  const { workspace_id } = params;

  await fetchWithAuth(`${TF_CLOUD_API_BASE}/workspaces/${workspace_id}/actions/unlock`, TFC_TOKEN, {
    method: "POST",
    headers: {
      "Content-Type": "application/vnd.api+json"
    }
  });

  let markdown = `## Workspace Unlocked\n\n`;
  markdown += `Workspace with ID \`${workspace_id}\` has been unlocked.\n`;

  return createStandardResponse("success", markdown, {
    workspace_id,
    locked: false,
    timestamp: new Date().toISOString()
  });
}
