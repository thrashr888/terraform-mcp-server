import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import logger from "../utils/logger.js";

export const addMigrateCloudsPrompt = (server: McpServer) => {
  logger.debug("Adding migrate-clouds prompt to MCP server");

  try {
    server.prompt(
      "migrate-clouds",
      {
        sourceCloud: z.string().describe("The cloud provider to migrate from (e.g., AWS, Azure, GCP)"),
        targetCloud: z.string().describe("The cloud provider to migrate to (e.g., AWS, Azure, GCP)"),
        terraformCode: z.string().describe("The Terraform code for the existing infrastructure")
      },
      ({ sourceCloud, targetCloud, terraformCode }) => {
        try {
          logger.debug(
            `migrate-clouds prompt handler called with: sourceCloud=${sourceCloud}, targetCloud=${targetCloud}, terraformCode length=${terraformCode?.length || 0}`
          );

          const response = {
            messages: [
              {
                role: "user" as const,
                content: {
                  type: "text" as const,
                  text: `Please help migrate the following Terraform code from ${sourceCloud} to ${targetCloud}:\n\n\`\`\`terraform\n${terraformCode}\n\`\`\``
                }
              }
            ]
          };

          logger.debug("Successfully generated migrate-clouds prompt response");
          return response;
        } catch (handlerError) {
          logger.error(`Error in migrate-clouds prompt handler: ${handlerError}`);
          throw handlerError;
        }
      }
    );

    logger.debug("migrate-clouds prompt successfully registered");
  } catch (registerError) {
    logger.error(`Failed to register migrate-clouds prompt: ${registerError}`);
    throw registerError;
  }
};
