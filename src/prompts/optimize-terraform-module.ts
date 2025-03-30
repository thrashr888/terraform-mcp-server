import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export const addOptimizeTerraformModulePrompt = (server: McpServer) => {
  server.prompt(
    "optimize-terraform-module",
    {
      terraformCode: z.string().describe("The Terraform module code to optimize")
    },
    ({ terraformCode }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please analyze the following Terraform module code and provide actionable recommendations for optimization based on security, cost, performance, and maintainability best practices. Include code snippets where applicable.\n\n\`\`\`terraform\n${terraformCode}\n\`\`\``
          }
        }
      ]
    })
  );
};
