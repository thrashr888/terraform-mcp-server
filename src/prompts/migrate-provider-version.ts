import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import logger from "../utils/logger.js";

export const addMigrateProviderVersionPrompt = (server: McpServer) => {
  logger.debug("Adding migrate-provider-version prompt to MCP server");

  try {
    server.prompt(
      "migrate-provider-version",
      {
        providerName: z.string().describe("The name of the Terraform provider (e.g., aws)"),
        currentVersion: z.string().describe("The current version of the provider"),
        targetVersion: z.string().describe("The target version of the provider"),
        terraformCode: z.string().optional().describe("Optional: Relevant Terraform code using the provider")
      },
      ({ providerName, currentVersion, targetVersion, terraformCode }) => {
        try {
          logger.debug(
            `migrate-provider-version prompt handler called with: providerName=${providerName}, currentVersion=${currentVersion}, targetVersion=${targetVersion}, terraformCode=${terraformCode ? "provided" : "not provided"}`
          );

          const response = {
            messages: [
              {
                role: "user" as const,
                content: {
                  type: "text" as const,
                  text: `Please provide a migration guide for upgrading the Terraform provider '${providerName}' from version ${currentVersion} to ${targetVersion}. Include details on breaking changes, new features, deprecated features, and step-by-step migration instructions.${terraformCode ? ` Consider the following code context:\n\n\`\`\`terraform\n${terraformCode}\n\`\`\`` : ""}`
                }
              }
            ]
          };

          logger.debug("Successfully generated migrate-provider-version prompt response");
          return response;
        } catch (handlerError) {
          logger.error(`Error in migrate-provider-version prompt handler: ${handlerError}`);
          throw handlerError;
        }
      }
    );

    logger.debug("migrate-provider-version prompt successfully registered");
  } catch (registerError) {
    logger.error(`Failed to register migrate-provider-version prompt: ${registerError}`);
    throw registerError;
  }
};
