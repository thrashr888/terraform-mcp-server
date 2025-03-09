import { expect, test, describe, beforeEach, jest } from "@jest/globals";
import {
  handleListRuns,
  handleShowRun,
  handleCreateRun,
  handleApplyRun,
  handleCancelRun
} from "../../handlers/runs.js";

// Mock the fetchWithAuth function
jest.mock("../../utils/hcpApiUtils.js", () => {
  return {
    fetchWithAuth: jest.fn().mockImplementation(async (...args) => {
      const url = args[0] as string;
      const options = args[2] as any;

      if (url.includes("/workspaces/ws-123/runs?")) {
        return {
          data: [
            {
              id: "run-123",
              type: "runs",
              attributes: {
                status: "applied",
                "created-at": "2024-03-01T12:00:00Z",
                message: "Weekly update",
                "is-destroy": false,
                "auto-apply": true,
                source: "tfe-api"
              }
            },
            {
              id: "run-456",
              type: "runs",
              attributes: {
                status: "planned",
                "created-at": "2024-02-28T10:30:00Z",
                message: "Infrastructure changes",
                "is-destroy": false,
                "auto-apply": false,
                source: "tfe-api"
              }
            }
          ]
        };
      } else if (url.includes("/runs/run-123") && !options) {
        return {
          data: {
            id: "run-123",
            type: "runs",
            attributes: {
              status: "applied",
              "created-at": "2024-03-01T12:00:00Z",
              message: "Weekly update",
              "is-destroy": false,
              "auto-apply": true,
              source: "tfe-api",
              "status-timestamps": {
                "plan-queued-at": "2024-03-01T11:55:00Z",
                "plan-started-at": "2024-03-01T11:56:00Z",
                "plan-finished-at": "2024-03-01T11:58:00Z",
                "apply-started-at": "2024-03-01T11:59:00Z",
                "apply-finished-at": "2024-03-01T12:00:00Z"
              }
            }
          }
        };
      } else if (url.includes("/runs/non-existent")) {
        const error = new Error("Run not found");
        throw error;
      } else if (url === `${process.env.TF_CLOUD_API_BASE}/runs` && options?.method === "POST") {
        return {
          data: {
            id: "run-new",
            type: "runs",
            attributes: {
              status: "pending",
              "created-at": "2024-03-02T09:00:00Z",
              "is-destroy": options.body.includes('"is-destroy":true'),
              "auto-apply": options.body.includes('"auto-apply":true'),
              source: "tfe-api"
            }
          }
        };
      } else if (url.includes("/runs/run-123/actions/apply") && options?.method === "POST") {
        return { data: { attributes: { status: "applying" } } };
      } else if (url.includes("/runs/run-123/actions/cancel") && options?.method === "POST") {
        return { data: { attributes: { status: "canceled" } } };
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

describe("Runs Tools", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should list runs for a workspace", async () => {
    const params = {
      workspace_id: "ws-123"
    };

    const result = await handleListRuns(params);

    // Check the response structure
    expect(result.status).toBe("success");
    expect(result.data.runs).toHaveLength(2);
    expect(result.data.total).toBe(2);
    expect(result.data.context.workspace_id).toBe("ws-123");

    // Check that the markdown contains the expected data
    expect(result.content).toContain("## Runs for Workspace: ws-123");
    expect(result.content).toContain("applied");
    expect(result.content).toContain("planned");
    expect(result.content).toContain("Weekly update");
    expect(result.content).toContain("Infrastructure changes");
  });

  test("should handle pagination parameters for listing runs", async () => {
    const params = {
      workspace_id: "ws-123",
      page_number: 2,
      page_size: 10
    };

    const result = await handleListRuns(params);

    // Check the response structure
    expect(result.status).toBe("success");
    expect(result.data.runs).toHaveLength(2); // Our mock always returns 2 runs
    expect(result.data.context.workspace_id).toBe("ws-123");
  });

  test("should show run details", async () => {
    const params = {
      run_id: "run-123"
    };

    const result = await handleShowRun(params);

    // Check the response structure
    expect(result.status).toBe("success");
    expect(result.data.run.id).toBe("run-123");
    expect(result.data.run.status).toBe("applied");
    expect(result.data.run.message).toBe("Weekly update");

    // Check that the markdown contains the expected data
    expect(result.content).toContain("## Run Details");
    expect(result.content).toContain("**Status**: applied");
    expect(result.content).toContain("**Message**: Weekly update");
    expect(result.content).toContain("### Timeline");
    expect(result.content).toContain("Plan Queued At");
    expect(result.content).toContain("Apply Finished At");
  });

  test("should handle errors when run not found", async () => {
    const params = {
      run_id: "non-existent"
    };

    await expect(handleShowRun(params)).rejects.toThrow("Run not found");
  });

  test("should create a run", async () => {
    const params = {
      workspace_id: "ws-123",
      message: "New infrastructure",
      is_destroy: false,
      auto_apply: true
    };

    const result = await handleCreateRun(params);

    // Check the response structure
    expect(result.status).toBe("success");
    expect(result.data.run.id).toBe("run-new");
    expect(result.data.run.status).toBe("pending");
    expect(result.data.context.workspace_id).toBe("ws-123");

    // Check that the markdown contains the expected data
    expect(result.content).toContain("## Run Created");
    expect(result.content).toContain("**ID**: run-new");
    expect(result.content).toContain("**Status**: pending");
    expect(result.content).toContain("**Message**: New infrastructure");
  });

  test("should apply a run", async () => {
    const params = {
      run_id: "run-123",
      comment: "Approved by admin"
    };

    const result = await handleApplyRun(params);

    // Check the response structure
    expect(result.status).toBe("success");
    expect(result.data.run_id).toBe("run-123");
    expect(result.data.applied).toBe(true);
    expect(result.data.comment).toBe("Approved by admin");

    // Check that the markdown contains the expected data
    expect(result.content).toContain("## Run Applied");
    expect(result.content).toContain("Run with ID `run-123` has been applied");
    expect(result.content).toContain("**Comment**: Approved by admin");
  });

  test("should cancel a run", async () => {
    const params = {
      run_id: "run-123",
      comment: "Canceled due to error"
    };

    const result = await handleCancelRun(params);

    // Check the response structure
    expect(result.status).toBe("success");
    expect(result.data.run_id).toBe("run-123");
    expect(result.data.canceled).toBe(true);
    expect(result.data.comment).toBe("Canceled due to error");

    // Check that the markdown contains the expected data
    expect(result.content).toContain("## Run Canceled");
    expect(result.content).toContain("Run with ID `run-123` has been canceled");
    expect(result.content).toContain("**Comment**: Canceled due to error");
  });
});
