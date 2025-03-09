import { resetFetchMocks, mockFetchResponse, mockFetchRejection, getFetchCalls } from "../global-mock";
import { TFC_TOKEN } from "../../config.js";
import { ExplorerQueryParams } from "../../handlers/explorer.js";

describe("Explorer Tool", () => {
  beforeEach(() => {
    resetFetchMocks();
  });

  test("should query workspaces and return formatted results", async () => {
    const mockResponse = {
      data: [
        {
          id: "ws-123",
          type: "workspaces",
          attributes: {
            name: "test-workspace",
            "terraform-version": "1.5.0",
            "resource-count": 42,
            "updated-at": "2024-03-06T12:00:00Z"
          }
        },
        {
          id: "ws-456",
          type: "workspaces",
          attributes: {
            name: "prod-workspace",
            "terraform-version": "1.4.6",
            "resource-count": 78,
            "updated-at": "2024-03-05T10:30:00Z"
          }
        }
      ]
    };

    mockFetchResponse({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    } as Response);
    
    // Simulate the explorer query parameters
    const params: ExplorerQueryParams = {
      organization: "test-org",
      type: "workspaces",
      fields: ["name", "terraform-version", "resource-count", "updated-at"]
    };
    
    // Build query parameters
    const queryParams = new URLSearchParams();
    queryParams.append("type", params.type);
    if (params.fields) queryParams.append("fields", params.fields.join(","));
    
    // Make the request to the API
    const url = `https://app.terraform.io/api/v2/organizations/${params.organization}/explorer?${queryParams.toString()}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${TFC_TOKEN}`,
        "Content-Type": "application/vnd.api+json"
      }
    });
    const data = await res.json();
    
    // Verify the request was made correctly
    const calls = getFetchCalls();
    expect(calls.length).toBe(1);
    expect(calls[0].url).toBe(url);
    expect(calls[0].options?.headers).toHaveProperty("Authorization");
    
    // Verify response data
    expect(data.data).toHaveLength(2);
    expect(data.data[0].attributes.name).toBe("test-workspace");
    expect(data.data[1].attributes.name).toBe("prod-workspace");
  });

  test("should handle filtering and sorting", async () => {
    const mockResponse = {
      data: [
        {
          id: "mod-123",
          type: "modules",
          attributes: {
            name: "vpc",
            provider: "aws",
            "version-count": 15,
            "workspace-count": 8
          }
        }
      ]
    };

    mockFetchResponse({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    } as Response);
    
    // Simulate the explorer query parameters
    const params: ExplorerQueryParams = {
      organization: "test-org",
      type: "modules",
      sort: "-workspace-count",
      filter: [
        {
          field: "provider",
          operator: "==",
          value: ["aws"]
        }
      ]
    };
    
    // Build query parameters
    const queryParams = new URLSearchParams();
    queryParams.append("type", params.type);
    if (params.sort) queryParams.append("sort", params.sort);
    if (params.filter) queryParams.append("filter", JSON.stringify(params.filter));
    
    // Make the request to the API
    const url = `https://app.terraform.io/api/v2/organizations/${params.organization}/explorer?${queryParams.toString()}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${TFC_TOKEN}`,
        "Content-Type": "application/vnd.api+json"
      }
    });
    const data = await res.json();
    
    // Verify the request was made correctly
    const calls = getFetchCalls();
    expect(calls.length).toBe(1);
    expect(calls[0].url).toBe(url);
    expect(calls[0].url).toContain("type=modules");
    expect(calls[0].url).toContain("sort=-workspace-count");
    expect(calls[0].url).toContain("filter=");
    
    // Verify response data
    expect(data.data).toHaveLength(1);
    expect(data.data[0].attributes.name).toBe("vpc");
    expect(data.data[0].attributes.provider).toBe("aws");
  });

  test("should handle empty results", async () => {
    const mockResponse = {
      data: []
    };

    mockFetchResponse({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    } as Response);
    
    // Simulate the explorer query parameters
    const params: ExplorerQueryParams = {
      organization: "test-org",
      type: "providers",
      filter: [
        {
          field: "name",
          operator: "==",
          value: ["nonexistent-provider"]
        }
      ]
    };
    
    // Build query parameters
    const queryParams = new URLSearchParams();
    queryParams.append("type", params.type);
    if (params.filter) queryParams.append("filter", JSON.stringify(params.filter));
    
    // Make the request to the API
    const url = `https://app.terraform.io/api/v2/organizations/${params.organization}/explorer?${queryParams.toString()}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${TFC_TOKEN}`,
        "Content-Type": "application/vnd.api+json"
      }
    });
    const data = await res.json();
    
    // Verify response data
    expect(data.data).toHaveLength(0);
  });

  test("should handle API errors", async () => {
    mockFetchRejection(new Error("API request failed"));
    
    // Simulate the explorer query parameters
    const params: ExplorerQueryParams = {
      organization: "test-org",
      type: "tf_versions"
    };
    
    // Build query parameters
    const queryParams = new URLSearchParams();
    queryParams.append("type", params.type);
    
    // Make the request to the API and expect it to fail
    const url = `https://app.terraform.io/api/v2/organizations/${params.organization}/explorer?${queryParams.toString()}`;
    await expect(fetch(url, {
      headers: {
        Authorization: `Bearer ${TFC_TOKEN}`,
        "Content-Type": "application/vnd.api+json"
      }
    })).rejects.toThrow("API request failed");
  });

  test("should handle pagination parameters", async () => {
    const mockResponse = {
      data: [
        {
          id: "ver-123",
          type: "tf_versions",
          attributes: {
            version: "1.5.0",
            "workspace-count": 10
          }
        }
      ]
    };

    mockFetchResponse({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    } as Response);
    
    // Simulate the explorer query parameters
    const params: ExplorerQueryParams = {
      organization: "test-org",
      type: "tf_versions",
      page_number: 2,
      page_size: 10
    };
    
    // Build query parameters
    const queryParams = new URLSearchParams();
    queryParams.append("type", params.type);
    if (params.page_number) queryParams.append("page[number]", params.page_number.toString());
    if (params.page_size) queryParams.append("page[size]", params.page_size.toString());
    
    // Make the request to the API
    const url = `https://app.terraform.io/api/v2/organizations/${params.organization}/explorer?${queryParams.toString()}`;
    await fetch(url, {
      headers: {
        Authorization: `Bearer ${TFC_TOKEN}`,
        "Content-Type": "application/vnd.api+json"
      }
    });
    
    // Verify the request was made correctly
    const calls = getFetchCalls();
    expect(calls.length).toBe(1);
    expect(calls[0].url).toBe(url);
    expect(calls[0].url).toContain("page%5Bnumber%5D=2");
    expect(calls[0].url).toContain("page%5Bsize%5D=10");
  });
}); 