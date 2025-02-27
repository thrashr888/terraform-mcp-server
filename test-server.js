#!/usr/bin/env node
import { spawn } from "child_process";
const serverProcess = spawn("node", ["dist/index.js"]);

// Set up error handling
serverProcess.on("error", (err) => {
  console.error("Server process error:", err);
  process.exit(1);
});

// Log server output for debugging
serverProcess.stderr.on("data", (data) => {
  console.log(`Server log: ${data}`);
});

// Wait a moment for the server to start
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
        namespace: "hashicorp",
      },
    },
  };

  // Send the request to the server
  serverProcess.stdin.write(JSON.stringify(request) + "\n");

  // Handle the response
  serverProcess.stdout.on("data", (data) => {
    console.log("Response received:");
    try {
      const response = JSON.parse(data);
      console.log(JSON.stringify(response, null, 2));
    } catch (e) {
      console.log("Raw response:", data.toString());
    }

    // Clean up and exit
    setTimeout(() => {
      serverProcess.kill();
      process.exit(0);
    }, 100);
  });
}, 1000);
