import { expect, test, describe, beforeEach, jest } from "@jest/globals";
import { handleListWorkspaceResources } from "../../handlers/workspaceResources.js";

// Mock the fetchWithAuth function
jest.mock("../../utils/hcpApiUtils.js", () => {
  return {
    fetchWithAuth: jest.fn().mockImplementation(async (...args) => {
      const url = args[0] as string;

      if (url.includes("/workspaces/ws-123/resources")) {
        // Check if filtering is applied
        if (url.includes("filter")) {
          return {
            data: [
              {
                id: "res-123",
                type: "resources",
                attributes: {
                  name: "web",
                  provider: "aws",
                  "provider-type": "aws",
                  "resource-type": "aws_instance",
                  mode: "managed",
                  "created-at": "2024-03-01T12:00:00Z",
                  "updated-at": "2024-03-01T12:00:00Z"
                }
              }
            ]
          };
        }

        return {
          data: [
            {
              id: "res-123",
              type: "resources",
              attributes: {
                name: "web",
                provider: "aws",
                "provider-type": "aws",
                "resource-type": "aws_instance",
                mode: "managed",
                "created-at": "2024-03-01T12:00:00Z",
                "updated-at": "2024-03-01T12:00:00Z"
              }
            },
            {
              id: "res-456",
              type: "resources",
              attributes: {
                name: "db",
                provider: "aws",
                "provider-type": "aws",
                "resource-type": "aws_db_instance",
                mode: "managed",
                "created-at": "2024-02-28T10:30:00Z",
                "updated-at": "2024-02-28T10:30:00Z"
              }
            }
          ]
        };
      } else if (url.includes("/workspaces/empty/resources")) {
        return { data: [] };
      }
      throw new Error("Unexpected URL in test");
    })
  };
});

// Mock the createStandardResponse function
jest.mock("../../utils/responseUtils.js", () => ({
  createStandardResponse: (status: string, content: string, data: any) => ({
    status,
    content,
    data
  })
}));

// Mock the TFC_TOKEN
jest.mock("../../config.js", () => ({
  TFC_TOKEN: "mock-token",
  TF_CLOUD_API_BASE: "https://app.terraform.io/api/v2"
}));

describe("Workspace Resources Tools", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should list resources for a workspace", async () => {
    const params = {
      workspace_id: "ws-123"
    };

    const result = await handleListWorkspaceResources(params);

    // Check the response structure
    expect(result.status).toBe("success");
    expect(result.data.resources).toHaveLength(2);
    expect(result.data.total).toBe(2);
    expect(result.data.context.workspace_id).toBe("ws-123");

    // Check that the markdown contains the expected data
    expect(result.content).toContain("## Resources for Workspace: ws-123");
    expect(result.content).toContain("web");
    expect(result.content).toContain("db");
    expect(result.content).toContain("aws_instance");
    expect(result.content).toContain("aws_db_instance");
  });

  test("should handle pagination parameters for listing resources", async () => {
    const params = {
      workspace_id: "ws-123",
      page_number: 2,
      page_size: 10
    };

    const result = await handleListWorkspaceResources(params);

    // Check the response structure
    expect(result.status).toBe("success");
    expect(result.data.resources).toHaveLength(2); // Our mock always returns 2 resources
    expect(result.data.context.workspace_id).toBe("ws-123");
  });

  test("should handle empty resources list", async () => {
    const params = {
      workspace_id: "empty"
    };

    const result = await handleListWorkspaceResources(params);

    // Check the response structure
    expect(result.status).toBe("success");
    expect(result.data.resources).toHaveLength(0);
    expect(result.data.total).toBe(0);

    // Check that the markdown contains the expected data
    expect(result.content).toContain("No resources found");
  });

  test("should handle filtering resources by type", async () => {
    const params = {
      workspace_id: "ws-123",
      resource_type: "aws_instance"
    };

    const result = await handleListWorkspaceResources(params);

    // Check the response structure
    expect(result.status).toBe("success");
    expect(result.data.resources).toHaveLength(1);
    expect(result.data.resources[0].type).toBe("aws_instance");
  });
});
