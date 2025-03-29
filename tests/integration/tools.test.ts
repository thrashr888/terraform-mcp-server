import { jest, describe, test, expect } from "@jest/globals";
import { runRequest, runToolCall, assertSuccessResponse, getOrganization } from "./helpers.js";

// Set shorter timeout for integration tests
jest.setTimeout(10000); // 10 seconds

/* eslint-disable jest/no-standalone-expect */
// For now, focus only on the most basic test to get integration tests passing
describe("MCP Tools Integration Tests", () => {
  test("should list available tools", async () => {
    const method = "tools/list";

    const response = await runRequest({
      jsonrpc: "2.0",
      id: 1,
      method: method,
      params: {}
    });

    assertSuccessResponse(response);
    expect(response.result.tools).toBeDefined();
    expect(Array.isArray(response.result.tools)).toBe(true);
    expect(response.result.tools.length).toBeGreaterThan(0);

    // Check that all tool objects have the required properties
    response.result.tools.forEach((tool: any) => {
      expect(tool.name).toBeDefined();
      expect(tool.description).toBeDefined();
      expect(tool.inputSchema).toBeDefined();
    });
  });

  // Enable registry tools tests selectively
  describe("Registry Tools", () => {
    // Enabled: This test doesn't make complex API calls
    test("moduleSearch should return VPC modules", async () => {
      const response = await runToolCall("moduleSearch", {
        query: "vpc"
      });

      assertSuccessResponse(response);
      expect(response.result.content).toBeDefined();
    });

    // Enable more tests
    test("providerDetails should return AWS provider information", async () => {
      const response = await runToolCall("providerDetails", {
        provider: "aws",
        namespace: "hashicorp"
      });

      assertSuccessResponse(response);
      expect(response.result.content).toBeDefined();
    });

    test("resourceUsage should return S3 bucket examples", async () => {
      const response = await runToolCall("resourceUsage", {
        provider: "aws",
        resource: "aws_s3_bucket"
      });

      assertSuccessResponse(response);
      expect(response.result.content).toBeDefined();
    });

    test("listDataSources should return AWS data sources", async () => {
      const response = await runToolCall("listDataSources", {
        provider: "aws",
        namespace: "hashicorp"
      });

      assertSuccessResponse(response);
      expect(response.result.content).toBeDefined();
    });

    test("resourceArgumentDetails should return AWS instance args", async () => {
      const response = await runToolCall("resourceArgumentDetails", {
        provider: "aws",
        namespace: "hashicorp",
        resource: "aws_instance"
      });

      assertSuccessResponse(response);
      expect(response.result.content).toBeDefined();
    });

    // Keep these as skipped since they might be more complex or rate-limited
    test("moduleDetails should return VPC module details", async () => {
      const response = await runToolCall("moduleDetails", {
        namespace: "terraform-aws-modules",
        module: "vpc",
        provider: "aws"
      });

      assertSuccessResponse(response);
      expect(response.result.content).toBeDefined();
    });

    test("functionDetails should return cidrsubnet function details", async () => {
      const response = await runToolCall("functionDetails", {
        provider: "aws",
        function: "cidrsubnet"
      });

      assertSuccessResponse(response);
      expect(response.result.content).toBeDefined();
    });

    test("providerGuides should return AWS guides", async () => {
      const response = await runToolCall("providerGuides", {
        provider: "aws"
      });

      assertSuccessResponse(response);
      expect(response.result.content).toBeDefined();
    });

    test("policySearch should return security policies", async () => {
      const response = await runToolCall("policySearch", {
        query: "security"
      });

      assertSuccessResponse(response);
      expect(response.result.content).toBeDefined();
    });

    test("policyDetails should return AWS S3 policy details", async () => {
      const response = await runToolCall("policyDetails", {
        namespace: "hashicorp",
        name: "CIS-Policy-Set-for-AWS-S3-Terraform"
      });

      assertSuccessResponse(response);
      expect(response.result.content).toBeDefined();
    });
  });

  describe("Terraform Cloud Tools", () => {
    // Skip this describe block if TFC_TOKEN is not set
    const hasTfcToken = !!process.env.TFC_TOKEN;
    const conditionalTest = hasTfcToken ? test : test.skip;

    conditionalTest("should list organizations", async () => {
      const response = await runToolCall("mcp_terraform_registry_listOrganizations", {
        random_string: "test"
      });

      assertSuccessResponse(response);
      expect(Array.isArray(response.result.content)).toBe(true);
    });

    conditionalTest("should query workspaces", async () => {
      const organization = getOrganization();
      const response = await runToolCall("mcp_terraform_registry_explorerQuery", {
        organization,
        type: "workspaces"
      });

      assertSuccessResponse(response);
      expect(response.result.content).toBeDefined();
    });
  });
});
