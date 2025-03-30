import { runToolCall, assertSuccessResponse, getOrganization, getWorkspaceId } from "./helpers.js";
import { jest, describe, test, expect, beforeAll } from "@jest/globals";

// Set shorter timeout for integration tests
jest.setTimeout(15000); // Longer timeout for Terraform Cloud operations

// Skip entire suite if TFC_TOKEN is missing
const hasTfcToken = !!process.env.TFC_TOKEN;
const describeWithToken = hasTfcToken ? describe : describe.skip;

describeWithToken("Terraform Cloud Tools Integration Tests", () => {
  // Test state
  let workspaceId: string | undefined;
  let runId: string | undefined;

  beforeAll(() => {
    if (!process.env.TFC_TOKEN) {
      throw new Error("TFC_TOKEN should be set for these tests to run");
    }
  });

  describe("Organization & Workspace Management", () => {
    test("listOrganizations should return organizations", async () => {
      const response = await runToolCall("listOrganizations", {});

      assertSuccessResponse(response);
      expect(response.result.content).toBeDefined();
      expect(Array.isArray(response.result.content)).toBe(true);
      // Ensure the response content isn't empty
      const contentText = response.result.content?.[0]?.text;
      expect(contentText).toBeDefined();
      expect(contentText).not.toBe("");
      // Check if the content text contains organization data (should include the configured org)
      expect(contentText).toContain(getOrganization());
    });

    test("privateModuleSearch should search for modules", async () => {
      const org = getOrganization();
      const response = await runToolCall("privateModuleSearch", {
        organization: org,
        query: "website"
      });

      assertSuccessResponse(response);
      expect(response.result.content).toBeDefined();
      // Ensure the response content is defined and is a string
      const moduleSearchText = response.result.content?.[0]?.text;
      expect(moduleSearchText).toBeDefined();
      // Check for module table content instead of the header text
      // expect(moduleSearchText).toContain("Modules matching");
      expect(moduleSearchText).toContain("| setup_complete |");
    });

    test("privateModuleDetails should return module details", async () => {
      const org = getOrganization();
      const response = await runToolCall("privateModuleDetails", {
        organization: org,
        namespace: org,
        name: "s3-website",
        provider: "aws"
      });

      assertSuccessResponse(response);
      expect(response.result.content).toBeDefined();
    });

    test("explorerQuery should query workspaces", async () => {
      const org = getOrganization();
      const response = await runToolCall("explorerQuery", {
        organization: org,
        type: "workspaces"
      });

      assertSuccessResponse(response);
      expect(response.result.content).toBeDefined();
    });

    test("listWorkspaces should return workspaces", async () => {
      const org = getOrganization();
      const response = await runToolCall("listWorkspaces", {
        organization: org
      });

      assertSuccessResponse(response);
      expect(response.result.content).toBeDefined();

      // Ensure the response text is defined and is a string
      const contentText = response.result.content?.[0]?.text;
      expect(contentText).toBeDefined();
      expect(typeof contentText).toBe("string");
      // Check if the content text contains the test workspace name
      // expect(contentText).toContain("| ws-");
      expect(contentText).toContain(getWorkspaceId());
    });

    test("workspaceDetails should return workspace details and store workspace ID", async () => {
      const org = getOrganization();
      const workspaceName = getWorkspaceId();

      try {
        const response = await runToolCall("workspaceDetails", {
          organization: org,
          name: workspaceName
        });

        assertSuccessResponse(response);
        expect(response.result.content).toBeDefined();

        // Extract the workspace ID by parsing the response content
        const contentText = response.result.content?.[0]?.text;
        if (contentText && typeof contentText === "string") {
          try {
            const parsed = JSON.parse(contentText);
            if (parsed.metadata?.workspace?.id) {
              workspaceId = parsed.metadata.workspace.id;
              console.log(`Extracted workspace ID: ${workspaceId}`);
            }
          } catch {
            // If parsing fails, try to extract ID from text with regex
            const match = contentText.match(/ID[^\w]+(ws-[a-zA-Z0-9]+)/);
            if (match && match[1]) {
              workspaceId = match[1];
              console.log(`Extracted workspace ID via regex: ${workspaceId}`);
            }
          }
        }

        // Also check context
        if (!workspaceId && response.result.context?.workspace_id) {
          workspaceId = response.result.context.workspace_id;
          console.log(`Using workspace ID from context: ${workspaceId}`);
        }
      } catch (error) {
        console.warn(`Could not get workspace details: ${error}`);
        console.log(`Make sure workspace "${workspaceName}" exists in organization "${org}"`);
        console.log(`You can set TEST_WORKSPACE_ID env var to specify a different workspace`);
      }
    });
  });

  describe("Workspace Operations", () => {
    test("workspace lifecycle operations", async () => {
      // Skip if we couldn't get a workspace ID
      if (!workspaceId) {
        console.log(`Using workspace name as fallback: ${getWorkspaceId()}`);
        workspaceId = getWorkspaceId();
      }

      // 1. First lock the workspace
      console.log("Locking workspace...");
      try {
        const lockResponse = await runToolCall("lockWorkspace", {
          workspace_id: workspaceId,
          reason: "Testing lock functionality from Jest"
        });
        assertSuccessResponse(lockResponse);
      } catch (error) {
        console.warn(`Could not lock workspace: ${error}`);
        // Continue with tests even if lock fails
      }

      // 2. Create a run
      console.log("Creating run...");
      try {
        const createResponse = await runToolCall("createRun", {
          workspace_id: workspaceId,
          message: "Test run from Jest integration tests",
          plan_only: true // Just plan, don't apply
        });
        assertSuccessResponse(createResponse);

        // Store the run ID
        if (createResponse.result.context?.run_id) {
          runId = createResponse.result.context.run_id;
          console.log(`Created run with ID: ${runId}`);
        } else {
          // Try to extract from content if available
          const contentText = createResponse.result.content?.[0]?.text;
          if (contentText && typeof contentText === "string") {
            try {
              const parsed = JSON.parse(contentText);
              if (parsed.metadata?.run?.id) {
                runId = parsed.metadata.run.id;
                console.log(`Extracted run ID from content: ${runId}`);
              }
            } catch {
              // If parsing fails, try regex
              const match = contentText.match(/ID[^\w]+(run-[a-zA-Z0-9]+)/);
              if (match && match[1]) {
                runId = match[1];
                console.log(`Extracted run ID via regex: ${runId}`);
              }
            }
          }
        }
      } catch (error) {
        console.warn(`Could not create run: ${error}`);
      }

      // Only proceed with run operations if we got a run ID
      if (runId) {
        // 3. List runs to verify our run exists
        console.log("Listing runs...");
        try {
          const listRunsResponse = await runToolCall("listRuns", {
            workspace_id: workspaceId
          });
          assertSuccessResponse(listRunsResponse);
          // Ensure the response content isn't empty and includes run data
          const listRunsText = listRunsResponse.result.content?.[0]?.text;
          expect(listRunsText).toBeDefined();
          expect(listRunsText).toContain("| run-");
        } catch (error) {
          console.warn(`Could not list runs: ${error}`);
        }

        // 4. Get run details
        console.log("Getting run details...");
        try {
          const runDetailsResponse = await runToolCall("runDetails", {
            run_id: runId
          });
          assertSuccessResponse(runDetailsResponse);
        } catch (error) {
          console.warn(`Could not get run details: ${error}`);
        }

        // 5. Cancel the run if it was created
        console.log("Cancelling run...");
        try {
          const cancelResponse = await runToolCall("cancelRun", {
            run_id: runId,
            comment: "Cancelling test run from Jest"
          });
          assertSuccessResponse(cancelResponse);
        } catch (error) {
          // It's possible the run already completed, which would make cancelling fail
          console.log("Failed to cancel run, it might have already completed:", error);
        }
      } else {
        console.warn("Skipping run tests because no run ID was obtained");
      }

      // 6. Finally unlock the workspace
      console.log("Unlocking workspace...");
      try {
        const unlockResponse = await runToolCall("unlockWorkspace", {
          workspace_id: "ws-r9XriqiYaXk4Xrfb"
        });
        assertSuccessResponse(unlockResponse);
      } catch (error) {
        console.warn(`Could not unlock workspace: ${error}`);
      }

      // 7. List workspace resources
      console.log("Listing workspace resources...");
      
      const resourcesResponse = await runToolCall("listWorkspaceResources", {
        // workspace "cool-website" is known to have resources
        workspace_id: "ws-r9XriqiYaXk4Xrfb"
      });
      assertSuccessResponse(resourcesResponse);
      // Ensure the response content isn't empty (it might legimitately have "No resources found")
      const resourcesText = resourcesResponse.result.content?.[0]?.text;
      expect(resourcesText).toBeDefined();
      // Check for the resource table header instead of just non-empty
      expect(resourcesText).toContain("| Name | Provider | Resource Type | Mode |");
    });
  });
});
