import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export const addGenerateResourceSkeletonPrompt = (server: McpServer) => {
  server.prompt(
    "generate-resource-skeleton",
    {
      resourceType: z.string().describe("The type of Terraform resource to generate (e.g., aws_s3_bucket)")
    },
    ({ resourceType }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please generate a skeleton for the Terraform resource type '${resourceType}' following best practices, including common tags, naming conventions, security considerations, and documentation comments.`
          }
        }
      ]
    })
  );
};
