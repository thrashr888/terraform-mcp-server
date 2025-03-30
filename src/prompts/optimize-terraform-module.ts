import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import logger from "../utils/logger.js";

export const addOptimizeTerraformModulePrompt = (server: McpServer) => {
  logger.debug("Adding optimize-terraform-module prompt to MCP server");

  try {
    server.prompt(
      "optimize-terraform-module",
      {
        terraformCode: z.string().describe("The Terraform module code to optimize")
      },
      ({ terraformCode }) => {
        try {
          logger.debug(
            `optimize-terraform-module prompt handler called with terraformCode length=${terraformCode?.length || 0}`
          );

          const response = {
            messages: [
              {
                role: "user" as const,
                content: {
                  type: "text" as const,
                  text: `Please analyze the following Terraform module code and provide actionable recommendations for optimization based on security, cost, performance, and maintainability best practices. Include code snippets where applicable.\n\n\`\`\`terraform\n${terraformCode}\n\`\`\``
                }
              }
            ]
          };

          logger.debug("Successfully generated optimize-terraform-module prompt response");
          return response;
        } catch (handlerError) {
          logger.error(`Error in optimize-terraform-module prompt handler: ${handlerError}`);
          throw handlerError;
        }
      }
    );

    logger.debug("optimize-terraform-module prompt successfully registered");
  } catch (registerError) {
    logger.error(`Failed to register optimize-terraform-module prompt: ${registerError}`);
    throw registerError;
  }
};
