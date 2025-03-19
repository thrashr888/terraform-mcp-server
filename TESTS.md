# Terraform MCP Server Testing

This document provides information about the testing approach and available test scripts for the Terraform MCP Server.

## Test Scripts Overview

The project includes several test scripts for different purposes:

| Script | Description |
|--------|-------------|
| `test.sh` | Main test script that tests all tools with formatted output |
| `test-tfc.sh` | Test script focused on Terraform Cloud (TFC) tools with formatted output |
| `test-resources.sh` | Minimal resource testing script focused on ResourceUsage handler |
| `test-server.js` | Starts a test server for manual testing |

## Running Jest Tests

The project uses Jest for unit and integration tests. To run the tests:

```bash
# Run all unit tests
npm test

# Run all integration tests
npm run test:integration

# Run registry-only integration tests (no TFC)
npm run test:integration:registry

# Run specific tests
npm test -- -t "resourceUsage"

# Run specific integration tests
npm run test:integration -- -t "should list providers"

# Run all tests and linting
npm run lint
```

## Integration Tests

The project includes comprehensive Jest integration tests in the `tests/integration` directory:

```
tests/integration/
├── README.md         # Documentation for integration tests
├── helpers.ts        # Helper functions for integration tests
├── resources.test.ts # Tests for Resources API
├── tfc.test.ts       # Tests for Terraform Cloud functionality
└── tools.test.ts     # Tests for MCP tools
```

These integration tests provide end-to-end testing of the MCP server's functionality, including:

- Resources API (registry and Terraform Cloud resources)
- MCP tools for interacting with the Terraform Registry
- Terraform Cloud operations

### Integration Test Structure

Each integration test file follows a similar structure:

1. Import necessary functions and set up test environment
2. Define test cases for specific functionality
3. Execute requests against the server
4. Verify responses match expected format and content

Example integration test:

```typescript
test('should list providers', async () => {
  const response = await runResourcesList("registry://providers");
  
  assertSuccessResponse(response);
  expect(response.result.type).toBe("success");
  expect(response.result.resources).toBeDefined();
  expect(Array.isArray(response.result.resources)).toBe(true);
  expect(response.result.resources.length).toBeGreaterThan(0);
});
```

### Integration Test Helpers

The `helpers.ts` file provides several important functions for integration testing:

- `runRequest()`: Runs a raw JSON-RPC request against the server
- `runToolCall()`: Runs a tool call request against the server
- `runResourcesList()`: Runs a resources/list request
- `runResourcesRead()`: Runs a resources/read request
- `assertSuccessResponse()`: Validates that a response is successful

#### Response Validation

The `assertSuccessResponse()` function performs comprehensive error checking:

```typescript
export function assertSuccessResponse(response: any): void {
  // Check response exists
  expect(response.result).toBeDefined();
  
  // Check for error fields
  if (response.result.error) {
    throw new Error(`API returned an error: ${JSON.stringify(response.result.error)}`);
  }
  
  // Check for error in content
  if (response.result.content?.[0]?.type === "error") {
    throw new Error(`API returned content error: ${response.result.content[0].text}`);
  }
  
  // Check for errors in JSON responses
  if (response.result.content?.[0]?.text && typeof response.result.content[0].text === 'string') {
    try {
      const parsed = JSON.parse(response.result.content[0].text);
      if (parsed.status === "error" || parsed.error) {
        throw new Error(`API returned embedded error: ${parsed.error || JSON.stringify(parsed)}`);
      }
    } catch (e) {
      // Not valid JSON or no error
    }
  }
  
  // Check for 404 responses
  if (response.result.type === "error") {
    throw new Error(`Resources API returned error: ${response.result.message}`);
  }
}
```

### Default Testing Values

Integration tests use sensible defaults to make testing easier:

```typescript
// Default values for testing
export const TEST_ORG = "pthrasher_v2";
export const TEST_WORKSPACE = "mcp-integration-test";

// Helper functions
export function getWorkspaceId(): string {
  return process.env.TEST_WORKSPACE_ID || TEST_WORKSPACE;
}

export function getOrganization(): string {
  return process.env.TEST_ORG || TEST_ORG;
}
```

You can override these values with environment variables:

```bash
TEST_ORG=my-org TEST_WORKSPACE_ID=my-workspace npm run test:integration
```

## Resource Testing

The `test-resources.sh` script tests a minimal set of commonly used resources for the `resourceUsage` handler:

```bash
# Run minimal test set
run_test "aws" "aws_s3_bucket" "AWS S3 Bucket"
run_test "google" "google_compute_instance" "Google Compute Instance"
```

### Basic Usage

To run the resource test script:

```bash
./test-resources.sh
```

The output will show:
- Which resources were tested
- A simple content preview
- A summary of passed and failed tests

## Integration with Jest Test Suite

The Jest test suite in `tests/tools/resourceUsage.test.ts` includes minimal resource tests:

```typescript
// Minimal resource tests - testing just core providers
describe("minimal resource tests", () => {
  test("should handle aws_s3_bucket resource", async () => {
    await testResourceFetch("aws", "aws_s3_bucket");
  });

  test("should handle google_compute_instance resource", async () => {
    await testResourceFetch("google", "google_compute_instance");
  });
});
```

## Main Test Scripts

### test.sh (Legacy)

The main test script runs through all available tools with detailed output formatting.

Usage:
```bash
./test.sh
```

## Terraform Cloud (TFC) Test Scripts

### test-tfc.sh (Legacy)

A dedicated test script for Terraform Cloud related tools with detailed output formatting.

Usage:
```bash
./test-tfc.sh
```

## Terraform Cloud (TFC) Tools

The following Terraform Cloud related tools are tested in the TFC test scripts:

| Tool | Description |
|------|-------------|
| `listOrganizations` | Lists all organizations the authenticated user has access to |
| `privateModuleSearch` | Searches for private modules in a Terraform Cloud organization |
| `privateModuleDetails` | Gets detailed information about a private module |
| `explorerQuery` | Queries the Terraform Cloud Explorer API to analyze data |
| `listWorkspaces` | Lists workspaces in a Terraform Cloud organization |
| `workspaceDetails` | Shows details of a specific workspace |
| `lockWorkspace` | Locks a workspace to prevent runs |
| `unlockWorkspace` | Unlocks a workspace to allow runs |
| `listRuns` | Lists runs for a workspace |
| `runDetails` | Shows details of a specific run |
| `createRun` | Creates a new run for a workspace |
| `applyRun` | Applies a run that's been planned |
| `cancelRun` | Cancels a run that's in progress |
| `listWorkspaceResources` | Lists resources in a workspace |

Example usage in a test script:

```bash
# List workspaces in an organization
run_tool_request "List Workspaces" '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"listWorkspaces","arguments":{"organization":"example-org"}}}'

# Show details of a specific run
run_tool_request "Show Run" '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"runDetails","arguments":{"run_id":"run-example"}}}'
```
