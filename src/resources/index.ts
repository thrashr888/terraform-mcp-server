/**
 * Entry point for MCP resources implementation
 */

import { handleListError, handleResourceError, addStandardContext } from "../utils/responseUtils.js";
import { TerraformCloudResources } from "./terraform.js";
import { RegistryResources } from "./registry.js";
import logger from "../utils/logger.js";

// Resource response interfaces
export interface ResourcesListResponse {
  type: "success" | "error";
  resources?: any[];
  error?: string;
  context?: Record<string, any>;
}

export interface ResourceReadResponse {
  type: "success" | "error";
  resource?: any;
  error?: string;
  context?: Record<string, any>;
}

export type ResourceHandler = {
  uriPattern: string;
  handler: (uri: string, params: Record<string, string>) => Promise<any>;
  list?: (params: Record<string, string>) => Promise<ResourcesListResponse>;
  read?: (params: Record<string, string>) => Promise<ResourceReadResponse>;
};

// Combine all resource handlers
const resourceHandlers: ResourceHandler[] = [...TerraformCloudResources, ...RegistryResources];

/**
 * Finds a resource handler for the given URI and extracts URI parameters
 */
function findHandler(uri: string): { handler: ResourceHandler | undefined; params: Record<string, string> } {
  const params: Record<string, string> = {};
  let matchedHandler: ResourceHandler | undefined;

  logger.debug(`Finding handler for URI: ${uri}`);
  logger.debug(`Available handlers: ${resourceHandlers.map((h) => h.uriPattern).join(", ")}`);

  // Find the first matching handler for the given URI
  for (const handler of resourceHandlers) {
    if (!handler.uriPattern) {
      logger.debug(`Handler missing uriPattern, skipping`);
      continue;
    }

    logger.debug(`Checking handler with pattern: ${handler.uriPattern}`);
    const match = uri.match(handler.uriPattern);

    if (match && match.groups) {
      matchedHandler = handler;
      logger.debug(`Found matching handler with pattern: ${handler.uriPattern}`);

      // Extract named parameters from regex groups
      for (const [key, value] of Object.entries(match.groups)) {
        if (value) params[key] = value;
      }
      logger.debug(`Extracted params: ${JSON.stringify(params)}`);
      break;
    }
  }

  if (!matchedHandler) {
    logger.debug(`No handler found for URI: ${uri}`);
  } else {
    logger.debug(
      `Handler found with ${matchedHandler.list ? "list" : "no list"} and ${matchedHandler.read ? "read" : "no read"} capabilities`
    );
  }

  return { handler: matchedHandler, params };
}

/**
 * Handle resources/list requests
 */
export async function handleResourcesList(uri: string): Promise<ResourcesListResponse> {
  try {
    logger.debug(`Processing resources/list for URI: ${uri}`);

    const { handler, params } = findHandler(uri);

    if (!handler || !handler.list) {
      return {
        type: "error",
        error: "Resource handler not found or does not support list operation",
        context: addStandardContext({
          uri,
          availableHandlers: Object.keys(resourceHandlers)
        })
      };
    }

    // Call the handler's list function
    return await handler.list(params);
  } catch (error) {
    logger.error(`Error in handleResourcesList: ${error}`);
    return {
      type: "error",
      error: error instanceof Error ? error.message : "Unknown error occurred",
      context: addStandardContext({
        uri,
        errorType: error instanceof Error ? error.name : "UnknownError",
        timestamp: new Date().toISOString()
      })
    };
  }
}

/**
 * Handle resources/read requests
 */
export async function handleResourcesRead(uri: string): Promise<ResourceReadResponse> {
  try {
    logger.debug(`Processing resources/read for URI: ${uri}`);

    const { handler, params } = findHandler(uri);

    if (!handler || !handler.read) {
      return {
        type: "error",
        error: "Resource handler not found or does not support read operation",
        context: addStandardContext({
          uri,
          availableHandlers: Object.keys(resourceHandlers)
        })
      };
    }

    // Call the handler's read function
    return await handler.read(params);
  } catch (error) {
    logger.error(`Error in handleResourcesRead: ${error}`);
    return {
      type: "error",
      error: error instanceof Error ? error.message : "Unknown error occurred",
      context: addStandardContext({
        uri,
        errorType: error instanceof Error ? error.name : "UnknownError",
        timestamp: new Date().toISOString()
      })
    };
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
