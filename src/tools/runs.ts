import { ResponseContent } from "../types/index.js";
import { fetchWithAuth } from "../utils/hcpApiUtils.js";
import { TFC_TOKEN, TF_CLOUD_API_BASE } from "../../config.js";
import { createStandardResponse } from "../utils/responseUtils.js";
import { URLSearchParams } from "url";

export interface RunsQueryParams {
  workspace_id: string;
  page_number?: number;
  page_size?: number;
  include?: string[];
}

export interface RunCreateParams {
  workspace_id: string;
  is_destroy?: boolean;
  message?: string;
  auto_apply?: boolean;
  refresh?: boolean;
  refresh_only?: boolean;
  plan_only?: boolean;
  terraform_version?: string;
}

export interface RunActionParams {
  run_id: string;
  comment?: string;
}

interface Run {
  id: string;
  type: string;
  attributes: {
    status: string;
    "created-at": string;
    message?: string;
    "is-destroy"?: boolean;
    "auto-apply"?: boolean;
    source?: string;
    "status-timestamps"?: Record<string, string>;
    [key: string]: any;
  };
  relationships?: Record<string, any>;
  links?: Record<string, any>;
}

export async function handleListRuns(params: RunsQueryParams): Promise<ResponseContent> {
  if (!TFC_TOKEN) {
    throw new Error("TFC_TOKEN environment variable is required for run operations");
  }

  const { workspace_id, page_number, page_size, include } = params;

  // Build query parameters
  const queryParams = new URLSearchParams();
  if (page_number) queryParams.append("page[number]", page_number.toString());
  if (page_size) queryParams.append("page[size]", page_size.toString());
  if (include && include.length > 0) queryParams.append("include", include.join(","));

  const response = await fetchWithAuth<Run[]>(
    `${TF_CLOUD_API_BASE}/workspaces/${workspace_id}/runs?${queryParams.toString()}`,
    TFC_TOKEN
  );

  // Format the response into a markdown table
  const runs = response.data.map((run: Run) => ({
    id: run.id,
    ...run.attributes
  }));

  let markdown = `## Runs for Workspace: ${workspace_id}\n\n`;

  if (runs.length > 0) {
    // Extract headers from the first run
    const headers = ["id", "status", "created-at", "message"];

    // Create markdown table header
    markdown += `| ${headers.join(" | ")} |\n`;
    markdown += `| ${headers.map(() => "---").join(" | ")} |\n`;

    // Add table rows
    runs.forEach((run: Record<string, any>) => {
      markdown += `| ${headers.map((h) => run[h] || "-").join(" | ")} |\n`;
    });
  } else {
    markdown += "No runs found.";
  }

  return createStandardResponse("success", markdown, {
    runs,
    total: runs.length,
    context: {
      workspace_id,
      timestamp: new Date().toISOString()
    }
  });
}

export async function handleShowRun(params: RunActionParams): Promise<ResponseContent> {
  if (!TFC_TOKEN) {
    throw new Error("TFC_TOKEN environment variable is required for run operations");
  }

  const { run_id } = params;

  const response = await fetchWithAuth<Run>(`${TF_CLOUD_API_BASE}/runs/${run_id}`, TFC_TOKEN);

  const run = {
    id: response.data.id,
    ...response.data.attributes
  };

  let markdown = `## Run Details\n\n`;
  markdown += `**ID**: ${run.id}\n`;
  markdown += `**Status**: ${run.status}\n`;
  markdown += `**Created At**: ${run["created-at"]}\n`;

  if (run.message) {
    markdown += `**Message**: ${run.message}\n`;
  }

  markdown += `**Is Destroy**: ${run["is-destroy"] ? "Yes" : "No"}\n`;
  markdown += `**Auto Apply**: ${run["auto-apply"] ? "Yes" : "No"}\n`;
  markdown += `**Source**: ${run.source || "-"}\n`;

  if (run["status-timestamps"]) {
    markdown += `\n### Timeline\n\n`;
    const timestamps = run["status-timestamps"];
    for (const [key, value] of Object.entries(timestamps)) {
      if (value) {
        markdown += `- **${key.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase())}**: ${value}\n`;
      }
    }
  }

  return createStandardResponse("success", markdown, {
    run,
    context: {
      timestamp: new Date().toISOString()
    }
  });
}

export async function handleCreateRun(params: RunCreateParams): Promise<ResponseContent> {
  if (!TFC_TOKEN) {
    throw new Error("TFC_TOKEN environment variable is required for run operations");
  }

  const { workspace_id, is_destroy, message, auto_apply, refresh, refresh_only, plan_only, terraform_version } = params;

  const payload = {
    data: {
      type: "runs",
      attributes: {
        "is-destroy": is_destroy,
        message,
        "auto-apply": auto_apply,
        refresh,
        "refresh-only": refresh_only,
        "plan-only": plan_only,
        "terraform-version": terraform_version
      },
      relationships: {
        workspace: {
          data: {
            type: "workspaces",
            id: workspace_id
          }
        }
      }
    }
  };

  const response = await fetchWithAuth<Run>(`${TF_CLOUD_API_BASE}/runs`, TFC_TOKEN, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/vnd.api+json"
    }
  });

  const run = {
    id: response.data.id,
    ...response.data.attributes
  };

  let markdown = `## Run Created\n\n`;
  markdown += `**ID**: ${run.id}\n`;
  markdown += `**Status**: ${run.status}\n`;
  markdown += `**Created At**: ${run["created-at"]}\n`;

  if (message) {
    markdown += `**Message**: ${message}\n`;
  }

  markdown += `**Is Destroy**: ${is_destroy ? "Yes" : "No"}\n`;
  markdown += `**Auto Apply**: ${auto_apply ? "Yes" : "No"}\n`;

  return createStandardResponse("success", markdown, {
    run,
    context: {
      workspace_id,
      timestamp: new Date().toISOString()
    }
  });
}

export async function handleApplyRun(params: RunActionParams): Promise<ResponseContent> {
  if (!TFC_TOKEN) {
    throw new Error("TFC_TOKEN environment variable is required for run operations");
  }

  const { run_id, comment } = params;

  const payload = comment ? { comment } : {};

  await fetchWithAuth(`${TF_CLOUD_API_BASE}/runs/${run_id}/actions/apply`, TFC_TOKEN, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/vnd.api+json"
    }
  });

  let markdown = `## Run Applied\n\n`;
  markdown += `Run with ID \`${run_id}\` has been applied.\n`;
  if (comment) {
    markdown += `\n**Comment**: ${comment}\n`;
  }

  return createStandardResponse("success", markdown, {
    run_id,
    applied: true,
    comment,
    timestamp: new Date().toISOString()
  });
}

export async function handleCancelRun(params: RunActionParams): Promise<ResponseContent> {
  if (!TFC_TOKEN) {
    throw new Error("TFC_TOKEN environment variable is required for run operations");
  }

  const { run_id, comment } = params;

  const payload = comment ? { comment } : {};

  await fetchWithAuth(`${TF_CLOUD_API_BASE}/runs/${run_id}/actions/cancel`, TFC_TOKEN, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/vnd.api+json"
    }
  });

  let markdown = `## Run Cancelled\n\n`;
  markdown += `Run with ID \`${run_id}\` has been cancelled.\n`;
  if (comment) {
    markdown += `\n**Comment**: ${comment}\n`;
  }

  return createStandardResponse("success", markdown, {
    run_id,
    cancelled: true,
    comment,
    timestamp: new Date().toISOString()
  });
}
