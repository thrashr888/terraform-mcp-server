import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { InitializeRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const SERVER_NAME = "test-server";
const VERSION = "1.0.0";

class MockTransport {
  callback: ((message: any) => void) | undefined;
  onclose: (() => void) | undefined;
  onerror: ((error: any) => void) | undefined;
  onmessage: ((message: any) => void) | undefined;
  isStarted: boolean = false;
  lastResponse: any = null;

  async start() {
    this.isStarted = true;
  }

  async close() {
    if (this.onclose) {
      this.onclose();
    }
  }

  async send(message: any) {
    this.lastResponse = JSON.parse(JSON.stringify(message)); // Deep copy to avoid reference issues
  }

  async connect(callback: (message: any) => void) {
    this.onmessage = callback;
    this.callback = callback;
    return Promise.resolve();
  }

  simulateReceive(message: any) {
    if (!this.onmessage && !this.callback) {
      throw new Error("Transport callback not set. Call connect() first.");
    }
    if (!this.isStarted) {
      throw new Error("Transport not started. Call start() first.");
    }
    if (this.onmessage) {
      this.onmessage(message);
    } else if (this.callback) {
      this.callback(message);
    }
  }

  waitForCallback(timeout = 5000): Promise<void> {
    const startTime = Date.now();
    const check = async (): Promise<void> => {
      if ((this.onmessage || this.callback) && this.isStarted) {
        return;
      }
      if (Date.now() - startTime > timeout) {
        throw new Error("Timeout waiting for callback");
      }
      await new Promise(resolve => setTimeout(resolve, 10));
      return check();
    };
    return check();
  }

  waitForResponse(timeout = 5000): Promise<void> {
    const startTime = Date.now();
    const check = async (): Promise<void> => {
      if (this.lastResponse !== null) {
        return;
      }
      if (Date.now() - startTime > timeout) {
        throw new Error("Timeout waiting for response");
      }
      await new Promise(resolve => setTimeout(resolve, 10));
      return check();
    };
    return check();
  }
}

describe("MCP Server", () => {
  let server: Server;
  let transport: MockTransport;

  beforeEach(async () => {
    transport = new MockTransport();
    server = new Server({
      name: SERVER_NAME,
      version: VERSION
    }, {
      capabilities: {
        tools: {}
      }
    });

    // Set up the initialization handler
    server.setRequestHandler(InitializeRequestSchema, async (request) => {
      return {
        protocolVersion: request.params.protocolVersion,
        capabilities: { tools: {} },
        serverInfo: { 
          name: SERVER_NAME, 
          version: VERSION 
        }
      };
    });

    await transport.start();
    await server.connect(transport);
    await transport.waitForCallback();
  }, 10000);

  afterEach(async () => {
    await server.close();
  });

  test("should handle initialization correctly", async () => {
    transport.simulateReceive({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "1.0.0",
        name: "test-client",
        version: "1.0.0",
        clientInfo: {
          name: "test-client",
          version: "1.0.0"
        },
        capabilities: {}
      }
    });

    await transport.waitForResponse();

    expect(transport.lastResponse).toMatchObject({
      jsonrpc: "2.0",
      id: 1,
      result: {
        protocolVersion: "1.0.0",
        capabilities: { tools: {} },
        serverInfo: { 
          name: SERVER_NAME, 
          version: VERSION 
        }
      }
    });
  });

  test("should handle errors correctly", async () => {
    transport.simulateReceive({
      jsonrpc: "2.0",
      id: 1,
      method: "unknown",
      params: {}
    });

    await transport.waitForResponse();

    expect(transport.lastResponse).toMatchObject({
      jsonrpc: "2.0",
      id: 1,
      error: {
        code: -32601,
        message: "Method not found"
      }
    });
  });

  test("should return correct format for initialize response", async () => {
    transport.simulateReceive({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "1.0.0",
        name: "test-client",
        version: "1.0.0",
        clientInfo: {
          name: "test-client",
          version: "1.0.0"
        },
        capabilities: {}
      }
    });

    await transport.waitForResponse();

    const response = transport.lastResponse;
    expect(response).toHaveProperty("jsonrpc", "2.0");
    expect(response).toHaveProperty("id", 1);
    expect(response).toHaveProperty("result");
    expect(response.result).toHaveProperty("protocolVersion", "1.0.0");
    expect(response.result).toHaveProperty("capabilities");
    expect(response.result.capabilities).toHaveProperty("tools");
    expect(response.result).toHaveProperty("serverInfo");
    expect(response.result.serverInfo).toHaveProperty("name", SERVER_NAME);
    expect(response.result.serverInfo).toHaveProperty("version", VERSION);
  });
}); 