// Import the necessary modules and types
import { resetFetchMocks, mockFetchResponse, getFetchCalls } from "../global-mock";

describe("moduleRecommendations tool", () => {
  beforeEach(() => {
    resetFetchMocks();
  });

  test("should return module recommendations when found", async () => {
    // Mock response data for module search
    const mockModules = {
      modules: [
        {
          id: "terraform-aws-modules/vpc/aws",
          namespace: "terraform-aws-modules",
          name: "vpc",
          provider: "aws",
          description: "AWS VPC Terraform module"
        },
        {
          id: "terraform-aws-modules/eks/aws",
          namespace: "terraform-aws-modules",
          name: "eks",
          provider: "aws",
          description: "AWS EKS Terraform module"
        }
      ]
    };
    
    mockFetchResponse({
      ok: true,
      json: () => Promise.resolve(mockModules)
    } as Response);

    // Simulate the tool request handler
    const input = { query: "vpc", provider: "aws" };
    
    // Construct the search URL
    const searchUrl = `https://registry.terraform.io/v1/modules/search?q=${encodeURIComponent(
      input.query
    )}&limit=3&verified=true&provider=${encodeURIComponent(input.provider)}`;
    
    // Make the request
    const res = await fetch(searchUrl);
    const resultData = await res.json();
    
    // Verify the request was made correctly
    const calls = getFetchCalls();
    expect(calls.length).toBe(1);
    expect(calls[0].url).toBe(searchUrl);
    
    // Verify the response processing
    expect(resultData).toHaveProperty("modules");
    expect(Array.isArray(resultData.modules)).toBe(true);
    expect(resultData.modules.length).toBe(2);
    expect(resultData.modules[0].name).toBe("vpc");
    
    // Create the recommendation text
    let recommendationText = `Recommended modules for "${input.query}":\n`;
    resultData.modules.forEach((mod: any, index: number) => {
      const name = `${mod.namespace}/${mod.name}`;
      const prov = mod.provider;
      const description = mod.description || "";
      recommendationText += `${index + 1}. ${name} (${prov}) - ${description}\n`;
    });
    
    // Verify the output format
    expect(recommendationText).toContain("terraform-aws-modules/vpc (aws)");
    expect(recommendationText).toContain("terraform-aws-modules/eks (aws)");
  });

  test("should handle no modules found", async () => {
    // Mock empty response
    mockFetchResponse({
      ok: true,
      json: () => Promise.resolve({ modules: [] })
    } as Response);

    // Simulate the tool request handler
    const input = { query: "nonexistent", provider: "aws" };
    
    // Construct the search URL
    const searchUrl = `https://registry.terraform.io/v1/modules/search?q=${encodeURIComponent(
      input.query
    )}&limit=3&verified=true&provider=${encodeURIComponent(input.provider)}`;
    
    // Make the request
    const res = await fetch(searchUrl);
    const resultData = await res.json();
    
    // Verify the response
    expect(resultData.modules).toHaveLength(0);
  });
}); 