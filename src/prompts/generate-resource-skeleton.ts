import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import logger from "../utils/logger.js";

export const addGenerateResourceSkeletonPrompt = (server: McpServer) => {
  logger.debug("Adding generate-resource-skeleton prompt to MCP server");

  try {
    server.prompt(
      "generate-resource-skeleton",
      {
        resourceType: z.string().describe("The type of Terraform resource to generate (e.g., aws_s3_bucket)")
      },
      ({ resourceType }) => {
        try {
          logger.debug(`generate-resource-skeleton prompt handler called with: resourceType=${resourceType}`);

          const response = {
            messages: [
              {
                role: "user" as const,
                content: {
                  type: "text" as const,
                  text: `Please generate a skeleton for the Terraform resource type '${resourceType}' following best practices, including common tags, naming conventions, security considerations, and documentation comments.`
                }
              }
            ]
          };

          logger.debug("Successfully generated generate-resource-skeleton prompt response");
          return response;
        } catch (handlerError) {
          logger.error(`Error in generate-resource-skeleton prompt handler: ${handlerError}`);
          throw handlerError;
        }
      }
    );

    logger.debug("generate-resource-skeleton prompt successfully registered");
  } catch (registerError) {
    logger.error(`Failed to register generate-resource-skeleton prompt: ${registerError}`);
    throw registerError;
  }
};
