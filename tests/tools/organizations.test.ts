import { expect, test, describe, beforeEach, jest } from "@jest/globals";
import { handleListOrganizations, handleShowOrganization } from "../../handlers/organizations.js";

// Mock the fetchWithAuth function
jest.mock("../../utils/hcpApiUtils.js", () => {
  return {
    fetchWithAuth: jest.fn().mockImplementation(async (...args) => {
      const url = args[0] as string;

      if (url.includes("/organizations?")) {
        return {
          data: [
            {
              id: "org-123",
              type: "organizations",
              attributes: {
                name: "example-org",
                "created-at": "2024-03-01T12:00:00Z",
                email: "admin@example.com",
                "session-timeout": 20160,
                "session-remember": 20160,
                "collaborator-auth-policy": "password",
                "plan-expired": false,
                "plan-expires-at": null,
                "cost-estimation-enabled": true,
                "external-id": null,
                "owners-team-saml-role-id": null,
                "saml-enabled": false,
                "two-factor-conformant": true
              }
            },
            {
              id: "org-456",
              type: "organizations",
              attributes: {
                name: "another-org",
                "created-at": "2024-02-15T10:30:00Z",
                email: "admin@another.com",
                "session-timeout": 20160,
                "session-remember": 20160,
                "collaborator-auth-policy": "password",
                "plan-expired": false,
                "plan-expires-at": null,
                "cost-estimation-enabled": true,
                "external-id": null,
                "owners-team-saml-role-id": null,
                "saml-enabled": false,
                "two-factor-conformant": true
              }
            }
          ]
        };
      } else if (url.includes("/organizations/example-org")) {
        return {
          data: {
            id: "org-123",
            type: "organizations",
            attributes: {
              name: "example-org",
              "created-at": "2024-03-01T12:00:00Z",
              email: "admin@example.com",
              "session-timeout": 20160,
              "session-remember": 20160,
              "collaborator-auth-policy": "password",
              "plan-expired": false,
              "plan-expires-at": null,
              "cost-estimation-enabled": true,
              "external-id": null,
              "owners-team-saml-role-id": null,
              "saml-enabled": false,
              "two-factor-conformant": true
            }
          }
        };
      } else if (url.includes("/organizations/non-existent")) {
        const error = new Error("Organization not found");
        throw error;
      }
      throw new Error("Unexpected URL in test");
    })
  };
});

// Mock the TFC_TOKEN
jest.mock("../../config.js", () => ({
  TFC_TOKEN: "mock-token",
  TF_CLOUD_API_BASE: "https://app.terraform.io/api/v2"
}));

// Mock the createStandardResponse function
jest.mock("../../utils/responseUtils.js", () => ({
  createStandardResponse: (status: string, content: string, data: any) => ({
    status,
    content,
    data
  })
}));

describe("Organizations Tools", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should list organizations", async () => {
    const result = await handleListOrganizations();

    // Check the response structure
    expect(result.status).toBe("success");
    expect(result.data.organizations).toHaveLength(2);
    expect(result.data.total).toBe(2);

    // Check that the markdown contains the expected data
    expect(result.content).toContain("## Organizations");
    expect(result.content).toContain("example-org");
    expect(result.content).toContain("another-org");
    expect(result.content).toContain("admin@example.com");
  });

  test("should handle pagination parameters for listing organizations", async () => {
    const params = {
      page_number: 2,
      page_size: 10
    };

    const result = await handleListOrganizations(params);

    // Check the response structure
    expect(result.status).toBe("success");
    expect(result.data.organizations).toHaveLength(2); // Our mock always returns 2 orgs
  });

  test("should show organization details", async () => {
    const params = {
      name: "example-org"
    };

    const result = await handleShowOrganization(params);

    // Check the response structure
    expect(result.status).toBe("success");
    expect(result.data.organization.id).toBe("org-123");
    expect(result.data.organization.name).toBe("example-org");
    expect(result.data.organization.email).toBe("admin@example.com");

    // Check that the markdown contains the expected data
    expect(result.content).toContain("## Organization: example-org");
    expect(result.content).toContain("**ID**: org-123");
    expect(result.content).toContain("**Email**: admin@example.com");
  });

  test("should handle errors when organization not found", async () => {
    const params = {
      name: "non-existent"
    };

    await expect(handleShowOrganization(params)).rejects.toThrow("Organization not found");
  });
});
