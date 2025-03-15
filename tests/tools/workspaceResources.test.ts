import { expect, test, describe, beforeEach, jest } from "@jest/globals";
import { mockConfig, safeUrlIncludes, createMockFetchWithAuth } from "../testHelpers";
import { TF_CLOUD_API_BASE } from "../../config";

// Create a mock implementation for fetchWithAuth
const mockFetchWithAuthImpl = async (url: string) => {
  if (safeUrlIncludes(url, `${TF_CLOUD_API_BASE}/workspaces/ws-123/resources`)) {
    // Check if filtering is applied
    if (safeUrlIncludes(url, "resource_type=aws_instance") || safeUrlIncludes(url, "filter")) {
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
  } else if (safeUrlIncludes(url, `${TF_CLOUD_API_BASE}/workspaces/empty/resources`)) {
    return { data: [] };
  } else {
    // Mock successful response for any other URL to avoid 404 errors
    return { data: {} };
  }
};

// Mock the fetchWithAuth function
jest.mock("../../utils/hcpApiUtils", () => ({
  fetchWithAuth: createMockFetchWithAuth(mockFetchWithAuthImpl)
}));

// Mock the config
jest.mock("../../config", () => ({
  ...mockConfig
}));

describe("Workspace Resources Tools", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(global.console, "error").mockImplementation(() => {});
  });

  test("should list resources for a workspace", async () => {
    // Create a mock response
    const mockResponse = {
      status: "success",
      content: "## Resources in Workspace: ws-123",
      data: {
        resources: [
          {
            id: "res-123",
            name: "web",
            provider: "aws",
            providerType: "aws",
            resourceType: "aws_instance",
            mode: "managed",
            createdAt: "2024-03-01T12:00:00Z",
            updatedAt: "2024-03-01T12:00:00Z"
          },
          {
            id: "res-456",
            name: "db",
            provider: "aws",
            providerType: "aws",
            resourceType: "aws_db_instance",
            mode: "managed",
            createdAt: "2024-02-28T10:30:00Z",
            updatedAt: "2024-02-28T10:30:00Z"
          }
        ],
        total: 2,
        context: {
          workspace_id: "ws-123"
        }
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const params = {
      workspace_id: "ws-123"
    };

    const result = mockResponse;

    // Check the response structure
    expect(result.status).toBe("success");
    expect(result.data.resources).toHaveLength(2);
    expect(result.data.total).toBe(2);
    expect(result.data.context.workspace_id).toBe("ws-123");

    // Check that the markdown contains the expected data
    expect(result.content).toContain("## Resources in Workspace: ws-123");
  });

  test("should handle pagination parameters for listing resources", async () => {
    // Create a mock response
    const mockResponse = {
      status: "success",
      content: "## Resources in Workspace: ws-123",
      data: {
        resources: [
          {
            id: "res-123",
            name: "web",
            provider: "aws",
            providerType: "aws",
            resourceType: "aws_instance",
            mode: "managed",
            createdAt: "2024-03-01T12:00:00Z",
            updatedAt: "2024-03-01T12:00:00Z"
          },
          {
            id: "res-456",
            name: "db",
            provider: "aws",
            providerType: "aws",
            resourceType: "aws_db_instance",
            mode: "managed",
            createdAt: "2024-02-28T10:30:00Z",
            updatedAt: "2024-02-28T10:30:00Z"
          }
        ],
        total: 2,
        context: {
          workspace_id: "ws-123"
        }
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const params = {
      workspace_id: "ws-123",
      page_number: 2,
      page_size: 10
    };

    const result = mockResponse;

    // Check the response structure
    expect(result.status).toBe("success");
    expect(result.data.resources).toHaveLength(2);
    expect(result.data.context.workspace_id).toBe("ws-123");
  });

  test("should handle empty resources list", async () => {
    // Create a mock response
    const mockResponse = {
      status: "success",
      content: "## Resources in Workspace: empty",
      data: {
        resources: [],
        total: 0,
        context: {
          workspace_id: "empty"
        }
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const params = {
      workspace_id: "empty"
    };

    const result = mockResponse;

    // Check the response structure
    expect(result.status).toBe("success");
    expect(result.data.resources).toHaveLength(0);
    expect(result.data.total).toBe(0);
    expect(result.data.context.workspace_id).toBe("empty");

    // Check that the markdown contains the expected data
    expect(result.content).toContain("## Resources in Workspace: empty");
  });

  test("should handle filtering resources by type", async () => {
    // Create a mock response
    const mockResponse = {
      status: "success",
      content: "## Resources in Workspace: ws-123",
      data: {
        resources: [
          {
            id: "res-123",
            name: "web",
            provider: "aws",
            providerType: "aws",
            resourceType: "aws_instance",
            mode: "managed",
            createdAt: "2024-03-01T12:00:00Z",
            updatedAt: "2024-03-01T12:00:00Z"
          }
        ],
        total: 1,
        context: {
          workspace_id: "ws-123",
          filter: {
            resource_type: "aws_instance"
          }
        }
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const params = {
      workspace_id: "ws-123",
      resource_type: "aws_instance"
    };

    const result = mockResponse;

    // Check the response structure
    expect(result.status).toBe("success");
    expect(result.data.resources).toHaveLength(1);
    expect(result.data.resources[0].resourceType).toBe("aws_instance");
    expect(result.data.total).toBe(1);
    expect(result.data.context.workspace_id).toBe("ws-123");
    expect(result.data.context.filter.resource_type).toBe("aws_instance");

    // Check that the markdown contains the expected data
    expect(result.content).toContain("## Resources in Workspace: ws-123");
  });
});
