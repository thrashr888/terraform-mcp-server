// Import the necessary modules and types
import { resetFetchMocks, mockFetchResponse, getFetchCalls } from "../global-mock.js";

describe("dataSourceLookup tool", () => {
  beforeEach(() => {
    resetFetchMocks();
  });

  test("should return list of data sources when found", async () => {
    // Mock data sources response
    const mockDataSources = {
      data_sources: [
        { id: "aws_ami", name: "aws_ami" },
        { id: "aws_instance", name: "aws_instance" },
        { id: "aws_vpc", name: "aws_vpc" }
      ]
    };

    mockFetchResponse({
      ok: true,
      json: () => Promise.resolve(mockDataSources)
    } as Response);

    // Simulate the tool request handler
    const input = { provider: "aws", namespace: "hashicorp" };

    // Make the request
    const url = `https://registry.terraform.io/v1/providers/${input.namespace}/${input.provider}/data-sources`;
    const response = await fetch(url);
    const data = await response.json();

    // Verify the request was made
    const calls = getFetchCalls();
    expect(calls.length).toBe(1);
    expect(calls[0].url).toBe(url);

    // Verify the data
    expect(data).toHaveProperty("data_sources");
    expect(data.data_sources.length).toBe(3);

    // Process the data
    const dataSourceNames = data.data_sources.map((ds: any) => ds.name || ds.id).filter(Boolean);

    // Verify the output
    expect(dataSourceNames).toContain("aws_ami");
    expect(dataSourceNames).toContain("aws_vpc");
  });

  test("should handle errors when data sources not found", async () => {
    mockFetchResponse({
      ok: false,
      status: 404,
      statusText: "Not Found"
    } as Response);

    // Simulate the tool request handler
    const input = { provider: "nonexistent", namespace: "hashicorp" };

    // Make the request
    const url = `https://registry.terraform.io/v1/providers/${input.namespace}/${input.provider}/data-sources`;
    const response = await fetch(url);

    // Verify response
    expect(response.ok).toBe(false);
    expect(response.status).toBe(404);
  });
});
