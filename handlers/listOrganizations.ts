import { ResponseContent } from "../types/index.js";
import { listOrganizations } from "../utils/hcpApiUtils.js";
import { TFC_TOKEN } from "../config.js";
import { createStandardResponse } from "../utils/responseUtils.js";

export async function handleListOrganizations(): Promise<ResponseContent> {
  if (!TFC_TOKEN) {
    throw new Error("TFC_TOKEN environment variable is required for listing organizations");
  }

  const organizations = await listOrganizations(TFC_TOKEN);
  
  // Format the organizations into a markdown table
  const orgDetails = organizations.map(org => ({
    "external-id": org.attributes["external-id"],
    name: org.attributes.name,
    email: org.attributes.email,
    created: new Date(org.attributes["created-at"]).toLocaleDateString()
  }));

  const markdown = `## Terraform Cloud Organizations (${organizations.length} total)

| External ID | Name | Email | Created |
|------------|------|-------|---------|
${orgDetails.map(org => 
    `| \`${org["external-id"]}\` | ${org.name} | ${org.email} | ${org.created} |`
  ).join("\n")}`;

  return createStandardResponse("success", markdown, {
    organizations: orgDetails,
    total: organizations.length,
    context: {
      timestamp: new Date().toISOString()
    }
  });
} 