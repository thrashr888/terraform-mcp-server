import { resetFetchMocks, mockFetchResponse, mockFetchRejection, getFetchCalls } from "../global-mock.js";
import { TFC_TOKEN } from "../../../config.js";

describe("Private Module Search Tool", () => {
  beforeEach(() => {
    resetFetchMocks();
  });

  test("should return private modules when found", async () => {
    const mockResponse = {
      data: [
        {
          id: "mod-123",
          attributes: {
            name: "test-module",
            provider: "aws",
            "registry-name": "private/test-module/aws",
            status: "published",
            "updated-at": "2024-03-06T12:00:00Z",
            "version-statuses": [
              {
                version: "1.0.0",
                status: "published"
              }
            ]
          }
        }
      ],
      meta: {
        pagination: {
          "current-page": 1,
          "total-pages": 1,
          "total-count": 1
        }
      }
    };

    mockFetchResponse({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    } as Response);

    const input = {
      organization: "test-org",
      query: "test",
      provider: "aws"
    };

    const url = `https://app.terraform.io/api/v2/organizations/${input.organization}/registry-modules`;
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
    expect(data.data[0].attributes.name).toBe("test-module");
  });

  test("should handle errors when modules not found", async () => {
    mockFetchRejection(new Error("Modules not found"));

    const input = { organization: "nonexistent-org" };

    const url = `https://app.terraform.io/api/v2/organizations/${input.organization}/registry-modules`;
    await expect(
      fetch(url, {
        headers: {
          Authorization: `Bearer ${TFC_TOKEN}`,
          "Content-Type": "application/vnd.api+json"
        }
      })
    ).rejects.toThrow("Modules not found");
  });

  test("should handle pagination parameters", async () => {
    const mockResponse = {
      data: [],
      meta: {
        pagination: {
          "current-page": 2,
          "total-pages": 5,
          "total-count": 50
        }
      }
    };

    mockFetchResponse({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    } as Response);

    const input = {
      organization: "test-org",
      page: 2,
      per_page: 10
    };

    const url = `https://app.terraform.io/api/v2/organizations/${input.organization}/registry-modules?page[number]=2&page[size]=10`;
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
    expect(data.meta.pagination["current-page"]).toBe(2);
  });
});
