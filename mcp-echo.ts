#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool
} from "@modelcontextprotocol/sdk/types.js";

// Define the echo tool
const ECHO_TOOL: Tool = {
  name: "echo",
  description: "A simple tool that echoes back any request sent to it. Useful for testing and debugging.",
  inputSchema: {
    type: "object",
    properties: {
      message: {
        type: "string",
        description: "Message to echo back"
      }
    },
    required: ["message"]
  }
};

// Initialize the server
const server = new Server(
  {
    name: "mcp-echo",
    version: "1.0.0"
  }
);

// ListToolsRequest handler - return our echo tool
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [ECHO_TOOL]
}));

// CallToolRequest handler - echo back the request
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "echo" && request.params.arguments?.message) {
    return {
      content: [{
        type: "text",
        text: `Echo: ${request.params.arguments.message}`
      }]
    };
  }
  return {
    content: [{
      type: "text",
      text: request.params.name === "echo" 
        ? "Error: message parameter is required" 
        : `Unknown tool: ${request.params.name}`
    }],
    isError: true
  };
});

// Server runner function
async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Echo MCP Server running on stdio");
}

// Start server with error handling
runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
}); 