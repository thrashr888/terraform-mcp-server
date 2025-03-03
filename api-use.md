# Terraform Registry API Usage

This document outlines our understanding and use of the Terraform Registry API for the terraform-mcp-server project.

## API Endpoints

### Provider Endpoints

- **Provider Lookup**: `https://registry.terraform.io/v1/providers/{namespace}/{provider}`
  - Used in `providerLookup` tool
  - Returns provider metadata including versions

- **Provider Schema**: `https://registry.terraform.io/v1/providers/{namespace}/{provider}/{version}/download/{os}/{arch}`
  - Used as a fallback in `dataSourceLookup` and `resourceArgumentDetails` tools
  - Returns detailed provider schema with resources and data sources

### Resource Endpoints

- **Resource Details**: `https://registry.terraform.io/v1/providers/{namespace}/{provider}/resources/{resource}`
  - Used in `resourceArgumentDetails`
  - This endpoint has been reported as returning 404 errors
  - We now use a fallback approach when this fails

- **Resource Documentation**: `https://registry.terraform.io/providers/{namespace}/{provider}/latest/docs/resources/{resource}`
  - HTML documentation page that can be parsed for examples
  - Used for retrieving resource details when API endpoints fail

### Module Endpoints

- **Module Search**: `https://registry.terraform.io/v1/modules/search?q={query}`
  - Used in `moduleRecommendations` tool
  - Returns modules matching the search query

- **Module Details**: `https://registry.terraform.io/v1/modules/{namespace}/{name}/{provider}`
  - Used in `moduleDetails` tool
  - Returns module metadata including versions and inputs

## API Changes and Issues

As of version 0.9.6, we've encountered some issues with the Terraform Registry API:

1. **Resource Details Endpoint Failures**:
   - The `/v1/providers/{namespace}/{provider}/resources/{resource}` endpoint often returns 404 errors
   - We've implemented fallbacks using documentation URLs to handle these failures

2. **Provider Schema Access**:
   - When API endpoints fail, we attempt to download the provider schema directly
   - This provides a complete schema but requires additional processing

## Fallback Strategies

When API endpoints fail, we employ these fallback strategies:

1. **Documentation URL Parsing**:
   - For resource details, we fall back to using the documentation URL directly
   - URLs follow the pattern: `https://registry.terraform.io/providers/{namespace}/{provider}/latest/docs/resources/{resource}`

2. **Provider Schema Download**:
   - For resource details, we can download the complete provider schema
   - This requires additional filtering to find the specific resource

## Future Improvements

Potential improvements to our API interaction:

1. **Caching**: Implement local caching of API responses to reduce load on the Registry
2. **Retry Logic**: Add more sophisticated retry logic for transient failures
3. **Version Selection**: Allow users to specify provider versions for more precise documentation