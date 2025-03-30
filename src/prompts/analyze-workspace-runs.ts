import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import logger from "../utils/logger.js";

// The SDK appears to only support string values for arguments
export const addAnalyzeWorkspaceRunsPrompt = (server: McpServer) => {
  logger.debug("Adding analyze-workspace-runs prompt to MCP server");

  try {
    server.prompt(
      "analyze-workspace-runs",
      {
        workspaceId: z.string().describe("The Terraform Cloud workspace ID to analyze"),
        runsToAnalyze: z.string().optional().describe("Number of recent runs to analyze (default: 5)")
      },
      ({ workspaceId, runsToAnalyze }) => {
        try {
          logger.debug(
            `analyze-workspace-runs prompt handler called with: workspaceId=${workspaceId}, runsToAnalyze=${runsToAnalyze}`
          );

          // Parse runsToAnalyze parameter safely
          let runsCount = 5; // Default
          if (runsToAnalyze !== undefined) {
            try {
              const parsed = parseInt(runsToAnalyze, 10);
              if (!isNaN(parsed) && parsed > 0) {
                runsCount = parsed;
              } else {
                logger.warn(`Invalid runsToAnalyze value: ${runsToAnalyze}, using default of 5`);
              }
            } catch (parseError) {
              logger.warn(`Error parsing runsToAnalyze: ${parseError}, using default of 5`);
            }
          }

          logger.debug(`Generating analyze-workspace-runs prompt with runsCount=${runsCount}`);

          const response = {
            messages: [
              {
                role: "user" as const,
                content: {
                  type: "text" as const,
                  text: `Please analyze the last ${runsCount} run(s) for Terraform Cloud workspace ${workspaceId}. Identify any common failure patterns, suggest troubleshooting steps, and recommend configuration improvements to prevent future issues.`
                }
              }
            ]
          };

          logger.debug("Successfully generated analyze-workspace-runs prompt response");
          return response;
        } catch (handlerError) {
          logger.error(`Error in analyze-workspace-runs prompt handler: ${handlerError}`);
          // Re-throw to let McpServer handle the error
          throw handlerError;
        }
      }
    );

    logger.debug("analyze-workspace-runs prompt successfully registered");
  } catch (registerError) {
    logger.error(`Failed to register analyze-workspace-runs prompt: ${registerError}`);
    throw registerError;
  }
};
