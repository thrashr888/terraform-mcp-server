/**
 * Entry point for MCP resources implementation
 */

import { matchUriPattern, extractUriParameters } from "../utils/uriUtils.js";
import { handleListError, handleResourceError } from "../utils/responseUtils.js";
import { TerraformCloudResources } from "./terraform.js";
import { RegistryResources } from "./registry.js";

export type ResourceHandler = {
  uriPattern: string;
  handler: (uri: string, params: Record<string, string>) => Promise<any>;
};

// Combine all resource handlers
const resourceHandlers: ResourceHandler[] = [...TerraformCloudResources, ...RegistryResources];

/**
 * Handle a resources/list request
 * @param uri The URI to list resources from
 * @returns List of resources
 */
export async function handleResourcesList(uri: string): Promise<any> {
  try {
    // Find a matching handler
    for (const handlerConfig of resourceHandlers) {
      const matches = matchUriPattern(uri, handlerConfig.uriPattern);
      if (matches) {
        const params = extractUriParameters(uri, handlerConfig.uriPattern);
        return await handlerConfig.handler(uri, params);
      }
    }

    return {
      type: "error",
      error: {
        code: "resource_not_found",
        message: `No resource handler found for URI: ${uri}`
      }
    };
  } catch (error) {
    return handleListError(error);
  }
}

/**
 * Handle a resources/read request
 * @param uri The URI to read
 * @returns The resource data
 */
export async function handleResourcesRead(uri: string): Promise<any> {
  try {
    // Find a matching handler
    for (const handlerConfig of resourceHandlers) {
      if (matchUriPattern(uri, handlerConfig.uriPattern)) {
        const params = extractUriParameters(uri, handlerConfig.uriPattern);
        return await handlerConfig.handler(uri, params);
      }
    }

    return {
      type: "error",
      error: {
        code: "resource_not_found",
        message: `No resource handler found for URI: ${uri}`
      }
    };
  } catch (error) {
    return handleResourceError(error);
  }
}

/**
 * Handle a resources/templates/list request
 * @param uri The template URI pattern
 * @returns List of available template parameters
 */
export async function handleResourcesTemplatesList(): Promise<any> {
  try {
    // This would return template information for parameterized resources
    // For now, return a basic response
    return {
      type: "success",
      templates: []
    };
  } catch (error) {
    return handleListError(error);
  }
}

/**
 * Handle a resources/subscribe request
 * @param uri The URI to subscribe to
 * @returns Subscription response
 */
export async function handleResourcesSubscribe(): Promise<any> {
  try {
    // Basic subscription implementation
    return {
      type: "success",
      subscriptionId: `sub_${Math.random().toString(36).substring(2, 15)}`
    };
  } catch (error) {
    return handleResourceError(error);
  }
}
