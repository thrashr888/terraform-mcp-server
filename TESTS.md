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

The project uses Jest for unit tests. To run the tests:

```bash
# Run all tests
npm test

# Run specific tests
npm test -- -t "resourceUsage"

# Run minimal resource tests
npm test -- -t "minimal resource tests"
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

### test.sh

The main test script runs through all available tools with detailed output formatting.

Usage:
```bash
./test.sh
```

## Terraform Cloud (TFC) Test Scripts

### test-tfc.sh

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
| `showWorkspace` | Shows details of a specific workspace |
| `lockWorkspace` | Locks a workspace to prevent runs |
| `unlockWorkspace` | Unlocks a workspace to allow runs |
| `listRuns` | Lists runs for a workspace |
| `showRun` | Shows details of a specific run |
| `createRun` | Creates a new run for a workspace |
| `applyRun` | Applies a run that's been planned |
| `cancelRun` | Cancels a run that's in progress |
| `listWorkspaceResources` | Lists resources in a workspace |

Example usage in a test script:

```bash
# List workspaces in an organization
run_tool_request "List Workspaces" '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"listWorkspaces","arguments":{"organization":"example-org"}}}'

# Show details of a specific run
run_tool_request "Show Run" '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"showRun","arguments":{"run_id":"run-example"}}}'
```
