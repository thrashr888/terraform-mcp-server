import { resetFetchMocks, mockFetchResponse, mockFetchRejection, getFetchCalls } from "../global-mock";
import { TFC_TOKEN } from "../../config.js";

describe("List Organizations Tool", () => {
  beforeEach(() => {
    resetFetchMocks();
  });

  test("should return list of organizations", async () => {
    const mockResponse = {
      data: [
        {
          id: "org-123",
          type: "organizations",
          attributes: {
            name: "test-org",
            "created-at": "2024-03-06T12:00:00Z",
            "email": "admin@test-org.com",
            "session-timeout": 20160,
            "session-remember": 20160,
            "collaborator-auth-policy": "password",
            "cost-estimation-enabled": true,
            "saml-enabled": false,
            "owners-team-saml-role-id": null,
            "fair-run-queuing-enabled": true,
            "two-factor-conformant": true
          },
          relationships: {
            "oauth-tokens": {
              links: {
                related: "/api/v2/organizations/test-org/oauth-tokens"
              }
            }
          },
          links: {
            self: "/api/v2/organizations/test-org"
          }
        }
      ],
      meta: {
        pagination: {
          "current-page": 1,
          "prev-page": null,
          "next-page": null,
          "total-pages": 1,
          "total-count": 1
        }
      }
    };

    mockFetchResponse({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    } as Response);
    
    const url = "https://app.terraform.io/api/v2/organizations";
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${TFC_TOKEN}`,
        "Content-Type": "application/vnd.api+json"
      }
    });
    const data = await res.json();
    
    const calls = getFetchCalls();
    expect(calls.length).toBe(1);
    expect(calls[0].url).toBe(url);
    expect(calls[0].options?.headers).toHaveProperty("Authorization");
    
    expect(data.data).toHaveLength(1);
    expect(data.data[0].attributes.name).toBe("test-org");
    expect(data.meta.pagination["total-count"]).toBe(1);
  });

  test("should handle authentication errors", async () => {
    mockFetchRejection(new Error("Authentication failed"));
    
    const url = "https://app.terraform.io/api/v2/organizations";
    await expect(fetch(url, {
      headers: {
        Authorization: `Bearer ${TFC_TOKEN}`,
        "Content-Type": "application/vnd.api+json"
      }
    })).rejects.toThrow("Authentication failed");
  });

  test("should handle empty organization list", async () => {
    const mockResponse = {
      data: [],
      meta: {
        pagination: {
          "current-page": 1,
          "prev-page": null,
          "next-page": null,
          "total-pages": 0,
          "total-count": 0
        }
      }
    };

    mockFetchResponse({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    } as Response);
    
    const url = "https://app.terraform.io/api/v2/organizations";
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${TFC_TOKEN}`,
        "Content-Type": "application/vnd.api+json"
      }
    });
    const data = await res.json();
    
    const calls = getFetchCalls();
    expect(calls.length).toBe(1);
    expect(calls[0].url).toBe(url);
    expect(data.data).toHaveLength(0);
    expect(data.meta.pagination["total-count"]).toBe(0);
  });
}); 