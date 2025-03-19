/**
 * Utilities for handling and parsing resource URIs
 */

/**
 * Parse a URI into its components
 * @param uri The URI to parse
 * @returns An object containing the scheme, path, and parsed path components
 */
export function parseUri(uri: string) {
  // URI format: scheme://path
  const match = uri.match(/^([^:]+):\/\/(.*)$/);
  if (!match) {
    throw new Error(`Invalid URI format: ${uri}`);
  }

  const [, scheme, path] = match;
  const pathComponents = path.split("/").filter(Boolean);

  return {
    scheme,
    path,
    pathComponents
  };
}

/**
 * Check if a URI matches a pattern
 * @param uri The URI to check
 * @param pattern The pattern to match against
 * @returns True if the URI matches the pattern
 */
export function matchUriPattern(uri: string, pattern: string): boolean {
  try {
    const uriParts = parseUri(uri);
    const patternParts = parseUri(pattern);

    // Scheme must match exactly
    if (uriParts.scheme !== patternParts.scheme) {
      return false;
    }

    // Check if path components match
    const uriPath = uriParts.pathComponents;
    const patternPath = patternParts.pathComponents;

    // Different lengths, can't match unless pattern has wildcards
    if (uriPath.length !== patternPath.length) {
      return false;
    }

    // Check each component
    for (let i = 0; i < patternPath.length; i++) {
      const patternComponent = patternPath[i];
      const uriComponent = uriPath[i];

      // If pattern component is in {brackets}, it's a parameter and matches anything
      if (patternComponent.startsWith("{") && patternComponent.endsWith("}")) {
        continue; // Parameter matches anything
      }

      // Otherwise, must match exactly
      if (patternComponent !== uriComponent) {
        return false;
      }
    }

    return true;
  } catch {
    // Any error means no match
    return false;
  }
}

/**
 * Extract parameters from a URI based on a pattern
 * @param uri The URI to extract parameters from
 * @param pattern The pattern containing parameter placeholders
 * @returns An object with the extracted parameters
 */
export function extractUriParameters(uri: string, pattern: string): Record<string, string> {
  const params: Record<string, string> = {};
  try {
    const uriParts = parseUri(uri);
    const patternParts = parseUri(pattern);

    // Schemes must match
    if (uriParts.scheme !== patternParts.scheme) {
      return params;
    }

    const uriPath = uriParts.pathComponents;
    const patternPath = patternParts.pathComponents;

    // Different lengths, can't match (unless we implement wildcards later)
    if (uriPath.length !== patternPath.length) {
      return params;
    }

    // Extract parameters
    for (let i = 0; i < patternPath.length; i++) {
      const patternComponent = patternPath[i];
      const uriComponent = uriPath[i];

      // If pattern component is in {brackets}, it's a parameter
      if (patternComponent.startsWith("{") && patternComponent.endsWith("}")) {
        const paramName = patternComponent.slice(1, -1); // Remove { and }
        params[paramName] = uriComponent;
      }
    }

    return params;
  } catch {
    // Return empty params on any error
    return params;
  }
}
