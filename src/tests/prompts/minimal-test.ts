import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { jest, describe, test } from "@jest/globals";
import path from "path";
import { fileURLToPath } from "url";

// Determine the root directory based on the current file's location
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../../..");
const serverScriptPath = path.join(rootDir, "dist", "index.js");

// Set a longer timeout for this test to ensure it has time to complete
jest.setTimeout(10000);

describe("MCP Prompt: Minimal Test", () => {
  let client: Client;
  let transport: StdioClientTransport;

  beforeAll(async () => {
    // Set up debug logging for transport
    process.env.LOG_LEVEL = "debug";

    console.log("Starting minimal test with server script:", serverScriptPath);

    transport = new StdioClientTransport({
      command: "node",
      args: [serverScriptPath],
      cwd: rootDir
    });

    client = new Client(
      {
        name: "test-client",
        version: "1.0.0"
      },
      {
        capabilities: { prompts: {} } // Indicate client supports prompts
      }
    );

    console.log("Connecting to server...");
    await client.connect(transport);
    console.log("Connected to server");
  });

  afterAll(async () => {
    console.log("Test complete, closing transport");
    if (transport) {
      await transport.close();
    }
  });

  // This test just verifies we can successfully list prompts
  test("should list all available prompts", async () => {
    console.log("Listing prompts...");
    const response = await client.listPrompts();
    console.log(
      "Got prompts:",
      response.prompts.map((p) => p.name)
    );
    expect(response.prompts.length).toBeGreaterThan(0);
  });

  // Uncomment this test to verify getPrompt functionality
  // eslint-disable-next-line jest/no-commented-out-tests
  /*
  test("should get a single prompt with minimal arguments", async () => {
    console.log("Testing getPrompt...");
    
    try {
      // Use a simple prompt with minimal arguments
      const args = { 
        resourceType: "aws_s3_bucket" 
      };
      
      console.log("Calling getPrompt with args:", args);
      // @ts-expect-error - Suppressing TS error for getPrompt first arg type
      const response = await client.getPrompt("generate-resource-skeleton", args);
      
      console.log("getPrompt response received:", response);
    } catch (error) {
      console.error("Error during getPrompt call:", error);
      // Rethrow to fail the test
      throw error;
    }
  });
  */
});
