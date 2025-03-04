# Terraform MCP Server Testing

This document provides information about the testing approach and available test scripts for the Terraform MCP Server.

## Test Scripts Overview

The project includes several test scripts for different purposes:

| Script | Description |
|--------|-------------|
| `test.sh` | Main test script that tests all tools with formatted output |
| `test-simple.sh` | Simplified test script that doesn't require jq |
| `test-resources.sh` | Minimal resource testing script focused on ResourceUsage handler |
| `test-tool.sh` | Tests a specific tool interactively |
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

### test-simple.sh

A simplified version of the main test script without dependencies on external tools like jq.

Usage:
```bash
./test-simple.sh
```

### test-tool.sh

This script allows you to test a specific tool interactively.

Usage:
```bash
./test-tool.sh <tool-name>
```

Example:
```bash
./test-tool.sh providerLookup
```

## Troubleshooting

If tests fail, check:
1. That the server builds correctly with `npm run build`
2. Network connectivity to the Terraform Registry API
3. Any console error messages in the output
4. If using Jest tests, ensure dependencies are installed with `npm install` 
