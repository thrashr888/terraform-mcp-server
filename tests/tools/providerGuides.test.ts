import { handleProviderGuides } from "../../handlers/index.js";
import { mockFetchResponse, resetFetchMocks } from "../global-mock.js";

describe("providerGuides tool", () => {
  beforeEach(() => {
    resetFetchMocks();
  });

  test("should list all guides when no search or guide specified", async () => {
    // Mock the guides list response
    mockFetchResponse({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        data: [
          {
            id: "8419193",
            attributes: {
              title: "Using HCP Terraform's Continuous Validation feature with the AWS Provider",
              slug: "continuous-validation-examples"
            }
          },
          {
            id: "8419197",
            attributes: {
              title: "Terraform AWS Provider Version 2 Upgrade Guide",
              slug: "version-2-upgrade"
            }
          }
        ]
      })
    });

    const response = await handleProviderGuides({
      provider: "aws"
    });

    const parsedContent = JSON.parse(response.content[0].text);
    expect(parsedContent.status).toBe("success");
    expect(parsedContent.content).toContain("Provider Guides");
    expect(parsedContent.content).toContain("Version Upgrade Guides");
    expect(parsedContent.content).toContain("Feature & Integration Guides");
    expect(parsedContent.metadata.summary.total).toBe(2);
  });

  test("should return specific guide content when guide is specified", async () => {
    // Mock the guides list response
    mockFetchResponse({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        data: [
          {
            id: "8419197",
            attributes: {
              title: "Terraform AWS Provider Version 2 Upgrade Guide",
              slug: "version-2-upgrade"
            }
          }
        ]
      })
    });

    // Mock the specific guide content response
    mockFetchResponse({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        data: {
          attributes: {
            title: "Terraform AWS Provider Version 2 Upgrade Guide",
            content: `---
description: |-
  This guide helps with upgrading to version 2 of the AWS provider.
---

# Upgrading to v2.0.0

Version 2.0.0 of the AWS provider includes several breaking changes.

## Breaking Changes

* Example breaking change`
          }
        }
      })
    });

    const response = await handleProviderGuides({
      provider: "aws",
      guide: "version-2-upgrade"
    });

    const parsedContent = JSON.parse(response.content[0].text);
    expect(parsedContent.status).toBe("success");
    expect(parsedContent.content).toContain("Version 2.0.0");
    expect(parsedContent.content).toContain("Breaking Changes");
    expect(parsedContent.metadata.guide.slug).toBe("version-2-upgrade");
  });

  test("should filter guides when search is provided", async () => {
    // Mock the guides list response
    mockFetchResponse({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        data: [
          {
            id: "8419197",
            attributes: {
              title: "Terraform AWS Provider Version 2 Upgrade Guide",
              slug: "version-2-upgrade"
            }
          },
          {
            id: "8419198",
            attributes: {
              title: "Terraform AWS Provider Version 3 Upgrade Guide",
              slug: "version-3-upgrade"
            }
          },
          {
            id: "8419193",
            attributes: {
              title: "Using HCP Terraform's Continuous Validation feature",
              slug: "continuous-validation-examples"
            }
          }
        ]
      })
    });

    const response = await handleProviderGuides({
      provider: "aws",
      search: "upgrade"
    });

    const parsedContent = JSON.parse(response.content[0].text);
    expect(parsedContent.status).toBe("success");
    expect(parsedContent.content).toContain("Search results for: \"upgrade\"");
    expect(parsedContent.content).toContain("Version 2 Upgrade Guide");
    expect(parsedContent.content).toContain("Version 3 Upgrade Guide");
    expect(parsedContent.content).not.toContain("Continuous Validation");
    expect(parsedContent.metadata.summary.upgradeGuides).toBe(2);
  });

  test("should handle errors when guides not found", async () => {
    // Mock a failed response
    mockFetchResponse({
      ok: false,
      status: 404,
      statusText: "Not Found"
    });

    const response = await handleProviderGuides({
      provider: "nonexistent"
    });

    const parsedContent = JSON.parse(response.content[0].text);
    expect(parsedContent.status).toBe("error");
    expect(parsedContent.error).toContain("Failed to fetch guides");
  });

  test("should handle missing required parameters", async () => {
    const response = await handleProviderGuides({
      provider: ""
    });

    const parsedContent = JSON.parse(response.content[0].text);
    expect(parsedContent.status).toBe("error");
    expect(parsedContent.error).toContain("required");
  });
}); 