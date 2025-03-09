import { expect, test, describe, beforeEach, jest } from "@jest/globals";
import {
  handleListWorkspaces,
  handleShowWorkspace,
  handleLockWorkspace,
  handleUnlockWorkspace
} from "../../handlers/workspaces.js";

// Mock the fetchWithAuth function
jest.mock("../../utils/hcpApiUtils.js", () => {
  return {
    fetchWithAuth: jest.fn().mockImplementation(async (...args) => {
      const url = args[0] as string;
      const options = args[2] as any;

      if (url.includes("/organizations/test-org/workspaces?")) {
        return {
          data: [
            {
              id: "ws-123",
              type: "workspaces",
              attributes: {
                name: "production",
                description: "Production environment workspace",
                "terraform-version": "1.5.0",
                "auto-apply": false,
                "working-directory": "",
                "updated-at": "2024-03-01T12:00:00Z",
                "resource-count": 15,
                permissions: { "can-update": true },
                actions: { "is-destroyable": false }
              }
            },
            {
              id: "ws-456",
              type: "workspaces",
              attributes: {
                name: "staging",
                description: "Staging environment workspace",
                "terraform-version": "1.4.6",
                "auto-apply": true,
                "working-directory": "terraform",
                "updated-at": "2024-02-28T10:30:00Z",
                "resource-count": 10,
                permissions: { "can-update": true },
                actions: { "is-destroyable": true }
              }
            }
          ]
        };
      } else if (url.includes("/organizations/test-org/workspaces/production")) {
        return {
          data: {
            id: "ws-123",
            type: "workspaces",
            attributes: {
              name: "production",
              description: "Production environment workspace",
              "terraform-version": "1.5.0",
              "auto-apply": false,
              "working-directory": "",
              "updated-at": "2024-03-01T12:00:00Z",
              "resource-count": 15,
              permissions: { "can-update": true },
              actions: { "is-destroyable": false }
            }
          }
        };
      } else if (url.includes("/organizations/test-org/workspaces/non-existent")) {
        const error = new Error("Workspace not found");
        throw error;
      } else if (url.includes("/workspaces/ws-123/actions/lock") && options?.method === "POST") {
        return { data: { attributes: { locked: true } } };
      } else if (url.includes("/workspaces/ws-123/actions/unlock") && options?.method === "POST") {
        return { data: { attributes: { locked: false } } };
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

describe("Workspaces Tools", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should list workspaces in an organization", async () => {
    const params = {
      organization_name: "test-org"
    };

    const result = await handleListWorkspaces(params);

    // Check the response structure
    expect(result.status).toBe("success");
    expect(result.data.workspaces).toHaveLength(2);
    expect(result.data.total).toBe(2);
    expect(result.data.context.organization).toBe("test-org");

    // Check that the markdown contains the expected data
    expect(result.content).toContain("## Workspaces in Organization: test-org");
    expect(result.content).toContain("production");
    expect(result.content).toContain("staging");
    expect(result.content).toContain("1.5.0");
    expect(result.content).toContain("1.4.6");
  });

  test("should handle pagination parameters for listing workspaces", async () => {
    const params = {
      organization_name: "test-org",
      page_number: 2,
      page_size: 10
    };

    const result = await handleListWorkspaces(params);

    // Check the response structure
    expect(result.status).toBe("success");
    expect(result.data.workspaces).toHaveLength(2); // Our mock always returns 2 workspaces
    expect(result.data.context.organization).toBe("test-org");
  });

  test("should show workspace details", async () => {
    const params = {
      organization_name: "test-org",
      name: "production"
    };

    const result = await handleShowWorkspace(params);

    // Check the response structure
    expect(result.status).toBe("success");
    expect(result.data.workspace.id).toBe("ws-123");
    expect(result.data.workspace.name).toBe("production");
    expect(result.data.workspace.description).toBe("Production environment workspace");

    // Check that the markdown contains the expected data
    expect(result.content).toContain("## Workspace: production");
    expect(result.content).toContain("**Terraform Version**: 1.5.0");
    expect(result.content).toContain("**Auto Apply**: No");
    expect(result.content).toContain("Production environment workspace");
  });

  test("should handle errors when workspace not found", async () => {
    const params = {
      organization_name: "test-org",
      name: "non-existent"
    };

    await expect(handleShowWorkspace(params)).rejects.toThrow("Workspace not found");
  });

  test("should lock a workspace", async () => {
    const params = {
      workspace_id: "ws-123",
      reason: "Maintenance"
    };

    const result = await handleLockWorkspace(params);

    // Check the response structure
    expect(result.status).toBe("success");
    expect(result.data.workspace_id).toBe("ws-123");
    expect(result.data.locked).toBe(true);
    expect(result.data.reason).toBe("Maintenance");

    // Check that the markdown contains the expected data
    expect(result.content).toContain("## Workspace Locked");
    expect(result.content).toContain("Workspace with ID `ws-123` has been locked");
    expect(result.content).toContain("**Reason**: Maintenance");
  });

  test("should unlock a workspace", async () => {
    const params = {
      workspace_id: "ws-123"
    };

    const result = await handleUnlockWorkspace(params);

    // Check the response structure
    expect(result.status).toBe("success");
    expect(result.data.workspace_id).toBe("ws-123");
    expect(result.data.locked).toBe(false);

    // Check that the markdown contains the expected data
    expect(result.content).toContain("## Workspace Unlocked");
    expect(result.content).toContain("Workspace with ID `ws-123` has been unlocked");
  });
});
