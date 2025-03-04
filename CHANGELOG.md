# Changelog

## 0.9.7 (March 3, 2024)
- Added comprehensive testing documentation in TESTS.md
- Simplified resource testing to focus on core providers
- Improved test organization and documentation
- Added Jest test suite for resource testing
- Updated README.md with testing information
- Fixed test script output formatting
- Improved error handling in resource tests

## 0.9.6 (May 21, 2024)
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

## 0.9.5 (April 23, 2024)
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

## 0.9.4 (2025-03-01)

### Improvements
- Enhanced testing infrastructure with improved error handling in test scripts
- Added additional resource type alternatives for the `exampleConfigGenerator` tool
- Updated documentation with comprehensive test script details
- Added better error reporting and fallback mechanisms for failing tests

## 0.9.3 (2025-03-01)

### Fixes
- Fixed implementation of the `mockImplementation` method in test mock function
- Added proper TypeScript type annotations to resolve type errors
- Improved mock transport callback handling in tests
- Fixed issues with the transport callback setup in the test environment

## 0.9.2 (2025-02-27)

### Fixes
- Fixed issue with MCP protocol compatibility when handling tool names and arguments
- Improved request handling to support both old and new MCP parameter formats
- Enhanced logging for better debugging capability
- Fixed test suite failures related to protocol changes

## 0.9.1 (2025-02-27)

### Improvements
- Completely redesigned `resourceArgumentDetails` tool with:
  - Enhanced schema parsing for better handling of complex resource types
  - Improved output formatting with clear sections for required/optional attributes
  - Support for nested block attributes and configuration
  - Robust fallback mechanism using documentation when schema API fails
  - Better error handling and debugging capabilities
- Updated version from development to release status

## 0.9.0 (2025-02-26)

### Updates
- Added comprehensive test suite for all tools
- Fixed test issues and improved mocking framework
- Removed dependency on vitest for testing
- Updated README with Cursor and Claude Desktop installation instructions

### Improvements
- Enhanced robustness with proper error handling in tests
- Improved mock transport handling for tests
- Added npx command installation option

## 0.8.0 (2025-02-25)

### Updates
- Added proper inputSchema definitions for all tools
- Updated server capabilities configuration to use listChanged flag

### Improvements
- Enhanced documentation with clear distinction between required and optional parameters

## 0.7.0 (2025-02-25)

### Updates
- Updated `@modelcontextprotocol/sdk` from 0.5.0 to 1.6.0
- Updated `diff` from ^5.1.0 to ^7.0.0
- Updated `glob` from ^10.3.10 to ^11.0.1
- Updated dependency type definitions

### Fixes
- Fixed compatibility issues with latest MCP protocol

## 0.2.0 (2025-02-24)

- Initial public release 