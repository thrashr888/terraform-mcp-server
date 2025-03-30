import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export const addMigrateCloudsPrompt = (server: McpServer) => {
  server.prompt(
    "migrate-clouds",
    {
      sourceCloud: z.string().describe("The cloud provider to migrate from (e.g., AWS, Azure, GCP)"),
      targetCloud: z.string().describe("The cloud provider to migrate to (e.g., AWS, Azure, GCP)"),
      terraformCode: z.string().describe("The Terraform code for the existing infrastructure")
    },
    ({ sourceCloud, targetCloud, terraformCode }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please help migrate the following Terraform code from ${sourceCloud} to ${targetCloud}:\n\n\`\`\`terraform\n${terraformCode}\n\`\`\``
          }
        }
      ]
    })
  );
};
