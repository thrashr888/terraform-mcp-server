import { resetFetchMocks, mockFetchResponse } from "../global-mock";
import { handleResourcesList, handleResourcesRead } from "../../resources/index";
import { TFC_TOKEN } from "../../config";

// Skip tests if TFC_TOKEN is not set
const runTest = TFC_TOKEN ? describe : describe.skip;

/* eslint-disable jest/no-conditional-expect */
runTest("Terraform Cloud Resources", () => {
  beforeEach(() => {
    resetFetchMocks();
  });

  describe("Organizations", () => {
    it("should list organizations", async () => {
      // Mock the organizations response
      mockFetchResponse({
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            {
              id: "org-123",
              type: "organizations",
              attributes: {
                name: "example-org",
                email: "admin@example.com",
                "session-timeout": 20160,
                "session-remember": 20160,
                "collaborator-auth-policy": "password",
                "plan-expired": false,
                "plan-expires-at": "2023-12-31T23:59:59Z",
                "plan-is-trial": false,
                "plan-is-enterprise": true,
                "created-at": "2021-01-01T00:00:00Z",
                permissions: {
                  "can-update": true,
                  "can-destroy": true,
                  "can-access-via-teams": true
                }
              }
            }
          ]
        })
      });

      const response = await handleResourcesList("terraform://organizations");

      // All tests should pass regardless of TFC_TOKEN
      expect(response.type).toBe("success");
      expect(response.resources).toBeDefined();
      expect(Array.isArray(response.resources)).toBe(true);

      // Only check specific data if TFC_TOKEN is set
      if (TFC_TOKEN) {
        // Use separate expect blocks with specific messages
        expect(response.resources.length).toBeGreaterThan(0);
        expect(response.resources[0].title).toBeDefined();
        expect(response.resources[0].uri).toMatch(/^terraform:\/\/organizations\//);
      }
    });
  });

  describe("Workspaces", () => {
    it("should list workspaces for an organization", async () => {
      // Skip this test if TFC_TOKEN is not set
      if (!TFC_TOKEN) {
        console.warn("Skipping test: TFC_TOKEN not set");
        return;
      }

      // Mock TFC API response
      mockFetchResponse({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            data: [
              {
                id: "ws-123",
                type: "workspaces",
                attributes: {
                  name: "test-workspace",
                  "created-at": "2022-01-01T00:00:00Z",
                  "terraform-version": "1.0.0",
                  "resource-count": 10
                }
              }
            ]
          })
      });

      const response = await handleResourcesList("terraform://organizations/test-org/workspaces");

      expect(response.type).toBe("success");
      expect(response.resources).toBeDefined();
      expect(Array.isArray(response.resources)).toBe(true);
    });

    it("should read workspace details", async () => {
      // Skip this test if TFC_TOKEN is not set
      if (!TFC_TOKEN) {
        console.warn("Skipping test: TFC_TOKEN not set");
        return;
      }

      // Mock TFC API response
      mockFetchResponse({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            data: {
              id: "ws-123",
              type: "workspaces",
              attributes: {
                name: "test-workspace",
                "created-at": "2022-01-01T00:00:00Z",
                "terraform-version": "1.0.0",
                "resource-count": 10,
                "auto-apply": false,
                "working-directory": ""
              }
            }
          })
      });

      const response = await handleResourcesRead("terraform://organizations/test-org/workspaces/test-workspace");

      expect(response.type).toBe("success");
      expect(response.resource).toBeDefined();
      expect(response.resource.uri).toBe("terraform://organizations/test-org/workspaces/test-workspace");
      expect(response.resource.content).toBeDefined();
    });
  });

  describe("Workspace Resources", () => {
    it("should list resources in a workspace", async () => {
      // Skip this test if TFC_TOKEN is not set
      if (!TFC_TOKEN) {
        console.warn("Skipping test: TFC_TOKEN not set");
        return;
      }

      // Mock workspace lookup response
      mockFetchResponse({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            data: [
              {
                id: "ws-123",
                type: "workspaces",
                attributes: {
                  name: "test-workspace"
                }
              }
            ]
          })
      });

      // Mock workspace resources response
      mockFetchResponse({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            data: [
              {
                id: "res-123",
                type: "resources",
                attributes: {
                  name: "test-resource",
                  address: "aws_instance.example",
                  provider: "aws"
                }
              }
            ]
          })
      });

      const response = await handleResourcesList(
        "terraform://organizations/test-org/workspaces/test-workspace/resources"
      );

      expect(response.type).toBe("success");
      expect(response.resources).toBeDefined();
      expect(Array.isArray(response.resources)).toBe(true);
    });

    it("should handle workspace not found", async () => {
      // Skip this test if TFC_TOKEN is not set
      if (!TFC_TOKEN) {
        console.warn("Skipping test: TFC_TOKEN not set");
        return;
      }

      // Mock error response
      mockFetchResponse({
        ok: false,
        status: 404,
        json: () =>
          Promise.resolve({
            errors: [{ status: "404", title: "Workspace not found" }]
          })
      });

      const response = await handleResourcesList("terraform://organizations/test-org/workspaces/nonexistent/resources");

      expect(response.type).toBe("success");
      expect(response.resources).toBeDefined();
      expect(Array.isArray(response.resources)).toBe(true);
      expect(response.resources.length).toBe(0); // Empty array for resilience
    });
  });
});
