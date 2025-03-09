#!/usr/bin/env node
// This is a test server that emulates a client by sending a test request to the MCP server
// and then exits after receiving a response.

import { spawn } from "child_process";
console.log("Starting test server...");

// Spawn the actual server process
const serverProcess = spawn("node", ["dist/index.js"]);

// Set up error handling
serverProcess.on("error", (err) => {
  console.error("Server process error:", err);
  process.exit(1);
});

// Log server output for debugging
serverProcess.stderr.on("data", (data) => {
  console.log(`Server log: ${data.toString().trim()}`);
});

// Wait a moment for the server to start
console.log("Waiting for server to initialize...");
setTimeout(() => {
  // Create a test request using proper JSON-RPC format
  const request = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: "providerLookup",
      arguments: {
        provider: "aws",
        namespace: "hashicorp"
      }
    }
  };

  console.log("Sending test request to server:");
  console.log(JSON.stringify(request, null, 2));

  // Send the request to the server
  serverProcess.stdin.write(JSON.stringify(request) + "\n");

  // Handle the response
  serverProcess.stdout.on("data", (data) => {
    console.log("Response received:");
    try {
      const response = JSON.parse(data);
      console.log(JSON.stringify(response, null, 2));
    } catch (error) {
      console.log("Raw response:", data.toString());
      console.log("Parse error:", error.message);
    }

    // Clean up and exit
    console.log("Test complete, exiting...");
    setTimeout(() => {
      serverProcess.kill();
      process.exit(0);
    }, 100);
  });
}, 1000);
