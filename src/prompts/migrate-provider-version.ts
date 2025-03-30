import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export const addMigrateProviderVersionPrompt = (server: McpServer) => {
  server.prompt(
    "migrate-provider-version",
    {
      providerName: z.string().describe("The name of the Terraform provider (e.g., aws)"),
      currentVersion: z.string().describe("The current version of the provider"),
      targetVersion: z.string().describe("The target version of the provider"),
      terraformCode: z.string().optional().describe("Optional: Relevant Terraform code using the provider")
    },
    ({ providerName, currentVersion, targetVersion, terraformCode }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please provide a migration guide for upgrading the Terraform provider '${providerName}' from version ${currentVersion} to ${targetVersion}. Include details on breaking changes, new features, deprecated features, and step-by-step migration instructions.${terraformCode ? ` Consider the following code context:\n\n\`\`\`terraform\n${terraformCode}\n\`\`\`` : ""}`
          }
        }
      ]
    })
  );
};
