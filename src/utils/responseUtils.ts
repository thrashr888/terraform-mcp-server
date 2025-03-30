import { DEFAULT_TERRAFORM_COMPATIBILITY } from "../../config.js";
import logger from "./logger.js";
import { ResponseContent } from "../types/index.js";

/**
 * Helper function to create standardized response format
 * @param status Status of the response (success or error)
 * @param content The main content to return
 * @param metadata Additional metadata to include in the response
 * @returns Formatted response object
 */
export function createStandardResponse(
  status: "success" | "error",
  content: string,
  metadata: Record<string, any> = {}
): ResponseContent {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          status,
          content,
          metadata
        })
      }
    ]
  };
}

/**
 * Helper function to format code examples as markdown
 * @param code Code snippet to format
 * @param language Language for syntax highlighting
 * @returns Formatted markdown code block
 */
export function formatAsMarkdown(code: string, language = "terraform"): string {
  return `\`\`\`${language}\n${code}\n\`\`\``;
}

/**
 * Helper function to format URLs
 * @param url URL to format
 * @returns Properly formatted URL
 */
export function formatUrl(url: string): string {
  try {
    const parsedUrl = new globalThis.URL(url);
    return parsedUrl.toString();
  } catch {
    logger.error(`Invalid URL: ${url}`);
    return url;
  }
}

/**
 * Helper function to add context information to responses
 * @param metadata Metadata object to enrich
 * @param contextType Type of context to add
 * @param contextInfo Context information
 * @returns Enriched metadata object
 */
export function addContextInfo(
  metadata: Record<string, any>,
  contextType: string,
  contextInfo: Record<string, any>
): Record<string, any> {
  if (!metadata.context) {
    metadata.context = {};
  }
  metadata.context[contextType] = contextInfo;
  return metadata;
}

/**
 * Adds standard compatibility information to metadata
 * @param metadata Metadata object to enrich
 * @returns Enriched metadata with compatibility info
 */
export function addStandardContext(metadata: Record<string, any> = {}): Record<string, any> {
  // Ensure context exists
  if (!metadata.context) {
    metadata.context = {};
  }

  // Add Terraform compatibility if not already specified
  if (!metadata.context.compatibility) {
    metadata.context.compatibility = {
      terraformCoreVersions: DEFAULT_TERRAFORM_COMPATIBILITY,
      lastUpdated: new Date().toISOString()
    };
  }

  // Add timestamp
  metadata.context.timestamp = new Date().toISOString();

  return metadata;
}

/**
 * Add standardized error metadata to an error response
 * @param metadata The metadata object to enhance
 * @param errorType The type/category of error
 * @param errorDetails Additional error details
 * @returns The enhanced metadata object
 */
export function addErrorContext(
  metadata: Record<string, any> = {},
  errorType: string,
  errorDetails: Record<string, any> = {}
): Record<string, any> {
  // Ensure error context exists
  if (!metadata.error) {
    metadata.error = {};
  }

  metadata.error.type = errorType;
  metadata.error.timestamp = new Date().toISOString();

  // Add any additional error details
  Object.assign(metadata.error, errorDetails);

  return metadata;
}

/**
 * Format errors for resources API responses
 * @param errorType Type of error (e.g., "not_found", "api_error", "parse_error")
 * @param message User-facing error message
 * @param details Additional error details (for logging/debugging)
 * @returns Standardized error structure
 */
export function formatResourceError(errorType: string, message: string, details?: Record<string, any>) {
  return {
    type: "error",
    code: errorType,
    message,
    details
  };
}

/**
 * Handles tool errors in a standardized way
 * @param toolName Name of the tool that encountered the error
 * @param error The error object
 * @param context Additional context about the error
 * @returns Standardized error response
 */
export function handleToolError(toolName: string, error: unknown, context?: Record<string, unknown>): ResponseContent {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const statusCode = (error as any)?.status || (error as any)?.statusCode;

  logger.error(`Error in ${toolName}:`, { error: errorMessage, context, statusCode });

  // Create enhanced error context
  const errorContext = {
    ...(context || {}),
    tool: toolName,
    timestamp: new Date().toISOString(),
    errorType: error instanceof Error ? error.constructor.name : typeof error,
    statusCode
  };

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          status: "error",
          error: errorMessage,
          context: errorContext
        })
      }
    ]
  };
}

/**
 * Handle errors for resource list operations
 * @param error The error that occurred
 * @param context Additional context about the error
 * @returns A standardized error response
 */
export function handleListError(error: any, context?: Record<string, any>): any {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const statusCode = error?.status || error?.statusCode;

  logger.error("Resource list error:", {
    error: errorMessage,
    context,
    statusCode,
    stack: error instanceof Error ? error.stack : undefined
  });

  // Determine error type based on status code or error message
  let errorCode = "list_failed";
  if (statusCode === 404 || errorMessage.includes("not found")) {
    errorCode = "not_found";
  } else if (statusCode >= 400 && statusCode < 500) {
    errorCode = "client_error";
  } else if (statusCode >= 500) {
    errorCode = "server_error";
  }

  return {
    type: "error",
    error: {
      code: errorCode,
      message: errorMessage || "Failed to list resources",
      context: {
        ...(context || {}),
        timestamp: new Date().toISOString(),
        statusCode
      }
    }
  };
}

/**
 * Handle errors for resource read operations
 * @param error The error that occurred
 * @param context Additional context about the error
 * @returns A standardized error response
 */
export function handleResourceError(error: any, context?: Record<string, any>): any {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const statusCode = error?.status || error?.statusCode;

  logger.error("Resource error:", {
    error: errorMessage,
    context,
    statusCode,
    stack: error instanceof Error ? error.stack : undefined
  });

  // Determine error type based on status code or error message
  let errorCode = "resource_error";
  if (statusCode === 404 || errorMessage.includes("not found")) {
    errorCode = "not_found";
  } else if (statusCode >= 400 && statusCode < 500) {
    errorCode = "client_error";
  } else if (statusCode >= 500) {
    errorCode = "server_error";
  }

  return {
    type: "error",
    error: {
      code: errorCode,
      message: errorMessage || "Error processing resource",
      context: {
        ...(context || {}),
        timestamp: new Date().toISOString(),
        statusCode
      }
    }
  };
}
