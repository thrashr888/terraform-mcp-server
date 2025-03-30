import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// The SDK appears to only support string values for arguments
export const addAnalyzeWorkspaceRunsPrompt = (server: McpServer) => {
  server.prompt(
    "analyze-workspace-runs",
    {
      workspaceId: z.string().describe("The Terraform Cloud workspace ID to analyze"),
      runsToAnalyze: z.string().optional().describe("Number of recent runs to analyze (default: 5)")
    },
    ({ workspaceId, runsToAnalyze }) => {
      const runsCount = runsToAnalyze ? parseInt(runsToAnalyze, 10) : 5;

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Please analyze the last ${runsCount} run(s) for Terraform Cloud workspace ${workspaceId}. Identify any common failure patterns, suggest troubleshooting steps, and recommend configuration improvements to prevent future issues.`
            }
          }
        ]
      };
    }
  );
};
