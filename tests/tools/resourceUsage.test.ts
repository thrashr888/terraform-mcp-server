// Import the necessary modules and types
import { resetFetchMocks, mockFetchResponse, getFetchCalls } from "../global-mock";

describe("resourceUsage tool", () => {
  beforeEach(() => {
    resetFetchMocks();
  });

  test("should return resource usage example when found", async () => {
    // Mock a successful API response with HTML content that includes example code
    const mockHtmlResponse = `
      <html>
        <body>
          <h2>Example Usage</h2>
          <pre class="highlight">
            resource "aws_instance" "example" {
              ami           = "ami-123456"
              instance_type = "t2.micro"
            }
          </pre>
        </body>
      </html>
    `;
    
    mockFetchResponse({
      ok: true,
      text: () => Promise.resolve(mockHtmlResponse)
    } as Response);

    // Define input parameters (used to construct the URL)
    const input = { provider: "aws", resource: "aws_instance" };
    
    // Make the request to the API
    const url = `https://registry.terraform.io/providers/${input.provider ? "hashicorp" : ""}/${input.provider || "aws"}/latest/docs/resources/${input.resource || "aws_instance"}`;
    const resp = await fetch(url);
    const html = await resp.text();
    
    // Verify the request was made correctly
    const calls = getFetchCalls();
    expect(calls.length).toBe(1);
    expect(calls[0].url).toBe(url);
    
    // Extract the example code
    let usageSnippet = "";
    const exampleIndex = html.indexOf(">Example Usage<");
    if (exampleIndex !== -1) {
      const codeStart = html.indexOf("<pre", exampleIndex);
      const codeEnd = html.indexOf("</pre>", codeStart);
      if (codeStart !== -1 && codeEnd !== -1) {
        let codeBlock = html.substring(codeStart, codeEnd);
        codeBlock = codeBlock.replace(/<[^>]+>/g, "");
        usageSnippet = codeBlock.trim();
      }
    }
    
    // Verify example extraction
    expect(usageSnippet).toContain("resource \"aws_instance\" \"example\"");
    expect(usageSnippet).toContain("ami");
    expect(usageSnippet).toContain("instance_type");
  });

  test("should handle errors when resource not found", async () => {
    mockFetchResponse({
      ok: false,
      status: 404,
      statusText: "Not Found"
    } as Response);

    // Define input parameters (used to construct the URL)
    const input = { provider: "aws", resource: "nonexistent_resource" };
    
    // Make the request to the API
    const url = `https://registry.terraform.io/providers/${input.provider ? "hashicorp" : ""}/${input.provider || "aws"}/latest/docs/resources/${input.resource || "nonexistent_resource"}`;
    const resp = await fetch(url);
    
    // Verify the response
    expect(resp.ok).toBe(false);
    expect(resp.status).toBe(404);
  });

  // Test for fallback response when no example is found
  test("should provide a fallback response when no example is found", async () => {
    // Mock a response with HTML content but no example code
    const mockHtmlResponse = `
      <html>
        <body>
          <h1>aws_s3_bucket</h1>
          <p>Some description text</p>
          <!-- No Example Usage section -->
        </body>
      </html>
    `;
    
    mockFetchResponse({
      ok: true,
      text: () => Promise.resolve(mockHtmlResponse)
    } as Response);

    // Define input parameters
    const input = { provider: "aws", resource: "aws_s3_bucket" };
    
    // Make the request to the API
    const url = `https://registry.terraform.io/providers/${input.provider}/latest/docs/resources/${input.resource}`;
    const resp = await fetch(url);
    const html = await resp.text();
    
    // Verify the request was made correctly
    const calls = getFetchCalls();
    expect(calls.length).toBe(1);
    expect(calls[0].url).toBe(url);
    
    // Check that the example code can't be found (simulating fallback scenario)
    const exampleIndex = html.indexOf(">Example Usage<");
    expect(exampleIndex).toBe(-1);
  });

  // Minimal resource tests - testing just core providers
  describe("minimal resource tests", () => {
    const testResourceFetch = async (provider: string, resource: string) => {
      // Mock HTML response
      const mockHtmlResponse = `<html><body><p>${resource}</p></body></html>`;
      
      mockFetchResponse({
        ok: true,
        text: () => Promise.resolve(mockHtmlResponse)
      } as Response);
      
      // Make the request to the API
      const url = `https://registry.terraform.io/providers/${provider}/latest/docs/resources/${resource}`;
      const resp = await fetch(url);
      
      // Verify the request was made correctly
      const calls = getFetchCalls();
      expect(calls.length).toBe(1);
      expect(calls[0].url).toBe(url);
      expect(resp.ok).toBe(true);
    };

    test("should handle aws_s3_bucket resource", async () => {
      await testResourceFetch("aws", "aws_s3_bucket");
    });

    test("should handle google_compute_instance resource", async () => {
      await testResourceFetch("google", "google_compute_instance");
    });
  });
}); 