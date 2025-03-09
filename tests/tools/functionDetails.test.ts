import { handleFunctionDetails } from "../../handlers/index.js";
import { mockFetchResponse, resetFetchMocks } from "../global-mock.js";

describe("functionDetails tool", () => {
  beforeEach(() => {
    resetFetchMocks();
  });

  test("should return function details when found", async () => {
    // Mock the function documentation ID response
    mockFetchResponse({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          data: [
            {
              id: "67890",
              attributes: {
                title: "arn_parse"
              }
            }
          ]
        })
    });

    // Mock the function documentation content response
    mockFetchResponse({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          data: {
            attributes: {
              title: "arn_parse",
              content: `---
subcategory: ""
layout: "aws"
page_title: "AWS: arn_parse"
description: |-
  Parses an ARN into its constituent parts.
---

# Function: arn_parse

## Signature

\`\`\`text
arn_parse(arn string) object
\`\`\`

## Example Usage

\`\`\`hcl
# result: 
# {
#   "partition": "aws",
#   "service": "iam",
#   "region": "",
#   "account_id": "444455556666",
#   "resource": "role/example",
# }
output "example" {
  value = provider::aws::arn_parse("arn:aws:iam::444455556666:role/example")
}
\`\`\`

## Arguments

1. \`arn\` (String) ARN (Amazon Resource Name) to parse.`
            }
          }
        })
    });

    const response = await handleFunctionDetails({
      provider: "aws",
      function: "arn_parse"
    });

    const parsedContent = JSON.parse(response.content[0].text);
    expect(parsedContent.status).toBe("success");
    expect(parsedContent.content).toContain("Function: arn_parse");
    expect(parsedContent.content).toContain("Parses an ARN into its constituent parts");
    expect(parsedContent.content).toContain("Example Usage");
    expect(parsedContent.metadata.function.name).toBe("arn_parse");
  });

  test("should handle errors when function not found", async () => {
    // Mock a failed response
    mockFetchResponse({
      ok: false,
      status: 404,
      statusText: "Not Found"
    });

    const response = await handleFunctionDetails({
      provider: "aws",
      function: "nonexistent_function"
    });

    const parsedContent = JSON.parse(response.content[0].text);
    expect(parsedContent.status).toBe("error");
    expect(parsedContent.error).toContain("Failed to fetch documentation IDs");
  });

  test("should handle missing required parameters", async () => {
    const response = await handleFunctionDetails({
      provider: "aws",
      function: ""
    });

    const parsedContent = JSON.parse(response.content[0].text);
    expect(parsedContent.status).toBe("error");
    expect(parsedContent.error).toContain("required");
  });
});
