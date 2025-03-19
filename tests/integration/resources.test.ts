import { runResourcesList, runResourcesRead, runToolCall, assertSuccessResponse, getOrganization } from "./helpers";
import { jest, describe, test, expect } from "@jest/globals";

// Set shorter timeout for integration tests
jest.setTimeout(10000); // 10 seconds

/* eslint-disable jest/no-standalone-expect */
describe("Resources API Integration Tests", () => {
  describe("Registry Resources", () => {
    test("should list providers", async () => {
      const response = await runResourcesList("registry://providers");

      assertSuccessResponse(response);
      expect(response.result.type).toBe("success");
      expect(response.result.resources).toBeDefined();
      expect(Array.isArray(response.result.resources)).toBe(true);
      expect(response.result.resources.length).toBeGreaterThan(0);

      // Extract a provider for subsequent tests
      const firstProvider = response.result.resources[0];
      expect(firstProvider.uri).toBeDefined();
    });

    test("should list AWS data sources", async () => {
      const response = await runResourcesList("registry://providers/hashicorp/aws/data-sources");

      assertSuccessResponse(response);
      expect(response.result.type).toBe("success");
      expect(response.result.resources).toBeDefined();
      expect(Array.isArray(response.result.resources)).toBe(true);
    });

    test("should read AWS provider details", async () => {
      const response = await runResourcesRead("registry://providers/hashicorp/aws");

      assertSuccessResponse(response);
      expect(response.result.type).toBe("success");
      expect(response.result.resource).toBeDefined();
      expect(response.result.resource.uri).toBe("registry://providers/hashicorp/aws");
      expect(response.result.resource.title).toBe("aws Provider");
      expect(response.result.resource.properties).toBeDefined();
      expect(response.result.resource.properties.namespace).toBe("hashicorp");
      expect(response.result.resource.properties.provider).toBe("aws");
    });

    test("should read AWS instance resource details", async () => {
      const response = await runResourcesRead("registry://providers/hashicorp/aws/resources/aws_instance");

      assertSuccessResponse(response);
      expect(response.result.type).toBe("success");
      expect(response.result.resource).toBeDefined();
      expect(response.result.resource.uri).toBe("registry://providers/hashicorp/aws/resources/aws_instance");
      expect(response.result.resource.title).toBe("aws_instance");
    });

    test("should list modules", async () => {
      const response = await runResourcesList("registry://modules");

      assertSuccessResponse(response);
      expect(response.result.type).toBe("success");
      expect(response.result.resources).toBeDefined();
      expect(Array.isArray(response.result.resources)).toBe(true);
    });
  });

  describe("Terraform Cloud Resources", () => {
    // Skip this describe block if TFC_TOKEN is not set
    const hasTfcToken = !!process.env.TFC_TOKEN;
    const conditionalTest = hasTfcToken ? test : test.skip;

    conditionalTest("should list organizations", async () => {
      const response = await runResourcesList("terraform://organizations");

      assertSuccessResponse(response);
      expect(response.result.type).toBe("success");
      expect(Array.isArray(response.result.resources)).toBe(true);
    });

    conditionalTest("should list workspaces", async () => {
      const org = getOrganization();
      const response = await runResourcesList(`terraform://organizations/${org}/workspaces`);

      assertSuccessResponse(response);
      expect(response.result.type).toBe("success");
      expect(Array.isArray(response.result.resources)).toBe(true);
    });
  });

  describe("Tool Compatibility", () => {
    test("resourceUsage tool should return valid response", async () => {
      const response = await runToolCall("resourceUsage", {
        provider: "aws",
        resource: "aws_s3_bucket"
      });

      assertSuccessResponse(response);
      expect(response.result.content).toBeDefined();
    });
  });
});
