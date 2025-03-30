# Changelog

## 0.13.0 (2025-03-29)

### Added
- Implemented MCP Resources API support for resource-oriented access patterns
- Added URI-based resource handlers for Terraform Registry and Terraform Cloud resources
- Created new URI schemes for accessing resources:
  - `registry://providers` - Access Terraform Registry providers
  - `registry://modules` - Access Terraform Registry modules
  - `terraform://organizations` - Access Terraform Cloud organizations and workspaces
- Added support for resources/list, resources/read, resources/templates/list, and resources/subscribe endpoints
- Created test script for resources implementation
- Added MCP Prompts capability with initial prompts:
  - `migrate-clouds`
  - `generate-resource-skeleton`
  - `optimize-terraform-module`
  - `migrate-provider-version`
  - `analyze-workspace-runs`

### Changed
- Updated server initialization to include resources and prompts capabilities
- Maintained backward compatibility with existing tool-based API

## 0.12.0 (2025-03-15)

### Changed
- Standardized tool naming patterns across the codebase for better consistency:
  - `providerLookup` → `providerDetails`
  - `moduleRecommendations` → `moduleSearch`
  - `dataSourceLookup` → `listDataSources` 
  - `showWorkspace` → `workspaceDetails`
  - `showRun` → `runDetails`
- Reorganized tool documentation in README.md with clearer grouping
- Separated core Registry tools from Terraform Cloud tools in documentation
- Updated tool descriptions for better clarity
- Updated test scripts to use the new standardized tool names

## 0.11.0 (2025-03-15)

### Added
- Added support for Explorer API integration to query workspace data
- Enhanced Terraform Cloud API integration with additional workspace management features
- Improved error handling for Terraform Cloud API requests

### Fixed
- Fixed authentication issues with Terraform Cloud API
- Updated error messages to provide more context about API failures
- Improved handling of rate limits for Terraform Registry API

### Changed
- Refactored Terraform Cloud API integration code for better maintainability
- Updated documentation with more examples for new API functionality

## 0.10.0 (2025-03-09)

### Added
- Added support for Terraform Cloud API operations
  - Workspaces: list, show, lock, unlock
  - Runs: list, show, create, apply, cancel
  - Organizations: list, show
  - Workspace Resources: list, show

### Fixed
- Updated handlers to use the correct types for API responses
- Fixed linting issues across the codebase
- Removed unused Organization interface from hcpApiUtils.ts

### Changed
- Consolidated organization handlers by moving functionality from `listOrganizations.ts` to `organizations.ts`
- Simplified API response handling in workspace and run handlers

## 0.9.8 (2025-03-05)
- Fixed initialization response format to match MCP protocol specification
- Updated test suite to properly validate server response format
- Improved server initialization handler to include correct protocol version
- Enhanced test coverage for server initialization

## 0.9.7 (2025-03-03)
- Added comprehensive testing documentation in TESTS.md
- Simplified resource testing to focus on core providers
- Improved test organization and documentation
- Added Jest test suite for resource testing
- Updated README.md with testing information
- Fixed test script output formatting
- Improved error handling in resource tests

## 0.9.6 (2025-03-02)
- Removed `exampleConfigGenerator` tool
- Simplified tool interface by removing unused parameters
- Updated tests to reflect tool changes
- Simplified `dataSourceLookup` function to use documentation URL directly
- Simplified `resourceArgumentDetails` function to use documentation URL directly
- Fixed 404 errors in test-simple.sh script
- Made tools more resilient to Terraform Registry API changes
- Removed fallback patterns in favor of simpler, more reliable direct documentation links
- Updated README.md to reflect removal of `exampleConfigGenerator` tool
- Updated api-use.md to document current API usage patterns
- Clarified required and optional parameters in documentation
- Improved documentation formatting and examples

## 0.9.5 (2025-03-02)
- Fixed `exampleConfigGenerator` function to handle API changes from HashiCorp Registry
- Added fallback approach that uses documentation URLs to generate example configs
- Added generate-example.sh script to help test example generation
- Updated test scripts to use local build instead of npx
- Added error handling for lookup tools
- Added better error descriptions for API failures
- Added Claude MCP tool endpoint compatibility
- Added docker run scripts
- Fixed resourceUsage edge cases
- Fixed dataSourceLookup API calls
- Updated `resourceArgumentDetails` tool to use the new Terraform Registry API endpoints
- Updated `exampleConfigGenerator` tool to use the new Terraform Registry API endpoints
- Removed `providerSchemaDetails` tool as the schema endpoint is not publicly 
available
- Fixed issues with resource schema retrieval

## 0.9.4 (2025-03-02)

### Improvements
- Enhanced testing infrastructure with improved error handling in test scripts
- Added additional resource type alternatives for the `exampleConfigGenerator` tool
- Updated documentation with comprehensive test script details
- Added better error reporting and fallback mechanisms for failing tests

## 0.9.3 (2025-02-27)

### Fixes
- Fixed implementation of the `mockImplementation` method in test mock function
- Added proper TypeScript type annotations to resolve type errors
- Improved mock transport callback handling in tests
- Fixed issues with the transport callback setup in the test environment

## 0.9.2

### Fixes
- Fixed issue with MCP protocol compatibility when handling tool names and arguments
- Improved request handling to support both old and new MCP parameter formats
- Enhanced logging for better debugging capability
- Fixed test suite failures related to protocol changes

## 0.9.1 (2025-02-25)

### Improvements
- Completely redesigned `resourceArgumentDetails` tool with:
  - Enhanced schema parsing for better handling of complex resource types
  - Improved output formatting with clear sections for required/optional attributes
  - Support for nested block attributes and configuration
  - Robust fallback mechanism using documentation when schema API fails
  - Better error handling and debugging capabilities
- Updated version from development to release status

## 0.9.0 (2025-02-24)

### Updates
- Added comprehensive test suite for all tools
- Fixed test issues and improved mocking framework
- Removed dependency on vitest for testing
- Updated README with Cursor and Claude Desktop installation instructions

### Improvements
- Enhanced robustness with proper error handling in tests
- Improved mock transport handling for tests
- Added npx command installation option

## 0.8.0 (2025-02-24)

### Updates
- Added proper inputSchema definitions for all tools
- Updated server capabilities configuration to use listChanged flag

### Improvements
- Enhanced documentation with clear distinction between required and optional parameters

## 0.7.0

### Updates
- Updated `@modelcontextprotocol/sdk` from 0.5.0 to 1.6.0
- Updated `diff` from ^5.1.0 to ^7.0.0
- Updated `glob` from ^10.3.10 to ^11.0.1
- Updated dependency type definitions

### Fixes
- Fixed compatibility issues with latest MCP protocol

## 0.2.0 (2025-02-23)

- Initial public release 