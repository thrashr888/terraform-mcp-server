# Terraform MCP Server Testing

This document provides information about the testing approach for the Terraform MCP Server.

## Overview

The project uses Jest for unit and integration tests, covering:

- **Tools**: Tests for all MCP tool handlers (Registry and TFC)
- **Resources**: Tests for the Resources API endpoints
- **Prompts**: Tests for MCP prompt functionality
- **Integration**: End-to-end tests for all components

## Running Tests

```bash
# Run all tests
npm test

# Run specific test patterns
npm test -- --testPathPattern=tools
npm test -- --testPathPattern=resources
npm test -- --testPathPattern=prompts

# Run integration tests
npm run test:integration
```

## Test Structure

### Tools Tests

Tests for MCP tools that interact with the Terraform Registry and Terraform Cloud:

- Registry tools (provider details, resource usage, module search)
- Terraform Cloud tools (workspace management, runs, resources)

### Resources Tests

Tests for the MCP Resources API endpoints:

- `resources/list` - Lists resources by URI
- `resources/read` - Reads a specific resource
- `resources/templates/list` - Lists available resource templates
- `resources/subscribe` - Tests subscription functionality

### Prompt Tests

Tests for MCP prompts in the `src/tests/prompts` directory:

| Prompt | Description | Key Arguments |
|--------|-------------|---------------|
| `migrate-clouds` | Cloud migration | `sourceCloud`, `targetCloud` |
| `generate-resource-skeleton` | Resource scaffolding | `resourceType` |
| `optimize-terraform-module` | Code optimization | `terraformCode` |
| `migrate-provider-version` | Version upgrades | `providerName`, `currentVersion` |
| `analyze-workspace-runs` | TFC run analysis | `workspaceId`, `runsToAnalyze` |

Run prompt tests specifically with:

```bash
npm test -- --testPathPattern=prompts
```

### Integration Tests

End-to-end tests that verify the complete server functionality:

- Tool call handling
- Resource listing and reading
- Error handling and validation

## Known Issues

### getPrompt Test Failures

Currently, tests for the `getPrompt` functionality are disabled due to consistent timeouts and server crashes. This is a known issue that needs further investigation. The issue might be related to how the SDK handles prompt requests or an implementation detail in the server.

## Environment Variables

Tests use sensible defaults, but you can override these with environment variables:

```bash
# For Terraform Cloud tests
TEST_ORG=my-org TEST_WORKSPACE_ID=my-workspace npm run test:integration

# Configure logging level
LOG_LEVEL=debug npm test
```