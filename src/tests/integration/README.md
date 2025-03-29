# Integration Tests

This directory contains integration tests for the Terraform MCP Server. These tests verify the server's functionality by starting a Node.js server process for each test and making real requests.

## Structure

The integration tests are organized as follows:

- `tests/integration/helpers.ts`: Helper functions for running tests
- `tests/integration/resources.test.ts`: Tests for the Resources API
- `tests/integration/tools.test.ts`: Tests for the Tools API
- `tests/integration/tfc.test.ts`: Tests for Terraform Cloud functionality

## Running Tests

```bash
# Run all integration tests
npm run test:integration

# Run specific test files
npm run test:integration -- -t "should list providers"

# Run with a specific workspace name
TEST_WORKSPACE_ID=my-workspace-name npm run test:integration
```

## Test Requirements

- Some tests require external credentials:
  - `TFC_TOKEN`: For Terraform Cloud tests (stored in environment or config.ts)
  - Workspace `mcp-integration-test` must exist in your organization for TFC tests

## Default Values

The integration tests use the following defaults:

- Organization: `pthrasher_v2` (can be overriden with `TEST_ORG` env var)
- Workspace name: `mcp-integration-test` (can be overriden with `TEST_WORKSPACE_ID` env var)

## Error Handling

The integration tests verify success responses and will fail the test if:

1. API returns an error result
2. API returns a 404 status
3. API returns error content
4. Timeout waiting for server to start (7 seconds)
5. Timeout waiting for server response (5 seconds)

## Adding New Tests

When adding new tests:

1. Use the helper functions in `helpers.ts`
2. Always use `assertSuccessResponse(response)` to validate responses
3. For Terraform Cloud tests, use the sequence pattern in `tfc.test.ts`
4. Set appropriate timeouts for your tests

## Differences from Unit Tests

- Integration tests start actual Node.js server processes
- They make real API calls to external services
- They test the full request/response cycle
- Tests take longer to run than unit tests

## Migration from Shell Scripts

These integration tests replace the previous shell scripts:
- `test.sh`
- `test-tfc.sh`
- `test-resources.sh`

The Jest tests provide better error reporting, organization, and isolation compared to shell scripts.
