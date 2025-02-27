# Changelog

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