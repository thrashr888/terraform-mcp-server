import { ResponseContent } from "../types/index.js";
import { fetchWithAuth } from "../utils/hcpApiUtils.js";
import { TFC_TOKEN, TF_CLOUD_API_BASE } from "../config.js";
import { createStandardResponse } from "../utils/responseUtils.js";
import { URLSearchParams } from "url";

export interface OrganizationsQueryParams {
  page_number?: number;
  page_size?: number;
}

interface Organization {
  id: string;
  type: string;
  attributes: {
    name: string;
    "created-at": string;
    email: string;
    "session-timeout": number;
    "session-remember": number;
    "collaborator-auth-policy": string;
    "plan-expired": boolean;
    "plan-expires-at": string | null;
    "cost-estimation-enabled": boolean;
    "external-id": string | null;
    "owners-team-saml-role-id": string | null;
    "saml-enabled": boolean;
    "two-factor-conformant": boolean;
    [key: string]: any;
  };
  relationships?: Record<string, any>;
  links?: Record<string, any>;
}

export async function handleListOrganizations(params: OrganizationsQueryParams = {}): Promise<ResponseContent> {
  if (!TFC_TOKEN) {
    throw new Error("TFC_TOKEN environment variable is required for organization operations");
  }

  const { page_number, page_size } = params;

  // Build query parameters
  const queryParams = new URLSearchParams();
  if (page_number) queryParams.append("page[number]", page_number.toString());
  if (page_size) queryParams.append("page[size]", page_size.toString());

  const response = await fetchWithAuth<Organization[]>(
    `${TF_CLOUD_API_BASE}/organizations?${queryParams.toString()}`,
    TFC_TOKEN
  );

  // Format the response into a markdown table
  const organizations = response.data.map((org: Organization) => ({
    id: org.id,
    ...org.attributes
  }));

  let markdown = `## Organizations\n\n`;

  if (organizations.length > 0) {
    // Create markdown table
    markdown += "| Name | Created At | Email | Plan Expired |\n";
    markdown += "|------|------------|-------|-------------|\n";

    organizations.forEach((org: any) => {
      markdown += `| ${org.name} | ${org["created-at"]} | ${org.email || "-"} | ${org["plan-expired"] ? "Yes" : "No"} |\n`;
    });
  } else {
    markdown += "No organizations found.";
  }

  return createStandardResponse("success", markdown, {
    organizations,
    total: organizations.length,
    context: {
      timestamp: new Date().toISOString()
    }
  });
}

export async function handleShowOrganization(params: { name: string }): Promise<ResponseContent> {
  if (!TFC_TOKEN) {
    throw new Error("TFC_TOKEN environment variable is required for organization operations");
  }

  const { name } = params;

  const response = await fetchWithAuth<Organization>(`${TF_CLOUD_API_BASE}/organizations/${name}`, TFC_TOKEN);

  const organization = {
    id: response.data.id,
    ...response.data.attributes
  };

  let markdown = `## Organization: ${organization.name}\n\n`;
  markdown += `**ID**: ${organization.id}\n`;
  markdown += `**Created At**: ${organization["created-at"]}\n`;
  markdown += `**Email**: ${organization.email || "-"}\n`;
  markdown += `**Session Timeout**: ${organization["session-timeout"]} minutes\n`;
  markdown += `**Session Remember**: ${organization["session-remember"]} minutes\n`;
  markdown += `**Collaborator Auth Policy**: ${organization["collaborator-auth-policy"]}\n`;
  markdown += `**Plan Expired**: ${organization["plan-expired"] ? "Yes" : "No"}\n`;

  if (organization["plan-expires-at"]) {
    markdown += `**Plan Expires At**: ${organization["plan-expires-at"]}\n`;
  }

  markdown += `**Cost Estimation Enabled**: ${organization["cost-estimation-enabled"] ? "Yes" : "No"}\n`;
  markdown += `**SAML Enabled**: ${organization["saml-enabled"] ? "Yes" : "No"}\n`;
  markdown += `**Two Factor Conformant**: ${organization["two-factor-conformant"] ? "Yes" : "No"}\n`;

  return createStandardResponse("success", markdown, {
    organization,
    context: {
      timestamp: new Date().toISOString()
    }
  });
}
