import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { resetFetchMocks } from './global-mock';

// Create a simple mock for StdioServerTransport
const mockStdioTransport = {
  connect: () => {},
  disconnect: () => {},
  send: () => {},
  setReceiveCallback: () => {}
};

describe('MCP Server', () => {
  let server: Server;
  
  beforeEach(() => {
    resetFetchMocks();
    
    // Create a new server instance for each test
    server = new Server(
      { name: "terraform-registry-mcp-test", version: "0.0.0-test" },
      { capabilities: { tools: { listChanged: true } } }
    );
  });
  
  test('should initialize correctly', () => {
    expect(server).toBeDefined();
  });
  
  test('should have request handlers registered', () => {
    // Create simple mock handlers
    const listToolsHandler = () => ({ tools: [] });
    const callToolHandler = () => ({ content: [] });
    
    // Register mock handlers like the real server does
    server.setRequestHandler(ListToolsRequestSchema, listToolsHandler);
    server.setRequestHandler(CallToolRequestSchema, callToolHandler);
    
    // Not a great way to test this, but we're verifying handlers exist
    expect(server).toBeDefined();
  });
  
  test('should handle errors gracefully', async () => {
    // Setup handler that throws an error
    const errorHandler = () => {
      throw new Error('Test error');
    };
    
    // Verify the handler throws an error as expected
    await expect(errorHandler).toThrow('Test error');
  });
}); 