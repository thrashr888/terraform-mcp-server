import { resetFetchMocks, mockFetchResponse, mockFetchRejection, getFetchCalls } from "../global-mock";
import { TFC_TOKEN } from "../../config.js";

describe("Private Module Details Tool", () => {
  beforeEach(() => {
    resetFetchMocks();
  });

  test("should return module details when found", async () => {
    const mockResponse = {
      data: {
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
          ],
          "no-code": {
            enabled: true,
            configuration: {
              variables: [
                {
                  name: "region",
                  type: "string",
                  default: "us-west-2"
                }
              ]
            }
          }
        }
      }
    };

    mockFetchResponse({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    } as Response);

    const input = {
      organization: "test-org",
      namespace: "private",
      name: "test-module",
      provider: "aws"
    };

    const url = `https://app.terraform.io/api/v2/organizations/${input.organization}/registry-modules/private/${input.namespace}/${input.name}/${input.provider}`;
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

    expect(data.data.attributes.name).toBe("test-module");
    expect(data.data.attributes["no-code"].enabled).toBe(true);
  });

  test("should handle errors when module not found", async () => {
    mockFetchRejection(new Error("Module not found"));

    const input = {
      organization: "test-org",
      namespace: "private",
      name: "nonexistent",
      provider: "aws"
    };

    const url = `https://app.terraform.io/api/v2/organizations/${input.organization}/registry-modules/private/${input.namespace}/${input.name}/${input.provider}`;
    await expect(
      fetch(url, {
        headers: {
          Authorization: `Bearer ${TFC_TOKEN}`,
          "Content-Type": "application/vnd.api+json"
        }
      })
    ).rejects.toThrow("Module not found");
  });

  test("should handle specific version request", async () => {
    const mockResponse = {
      data: {
        id: "mod-123",
        attributes: {
          name: "test-module",
          provider: "aws",
          version: "1.0.0",
          status: "published",
          "updated-at": "2024-03-06T12:00:00Z"
        }
      }
    };

    mockFetchResponse({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    } as Response);

    const input = {
      organization: "test-org",
      namespace: "private",
      name: "test-module",
      provider: "aws",
      version: "1.0.0"
    };

    const url = `https://app.terraform.io/api/v2/organizations/${input.organization}/registry-modules/private/${input.namespace}/${input.name}/${input.provider}/versions/${input.version}`;
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
    expect(data.data.attributes.version).toBe("1.0.0");
  });
});
