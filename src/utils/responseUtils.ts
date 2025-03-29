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
export function addStandardContext(metadata: Record<string, any>): Record<string, any> {
  return addContextInfo(metadata, "compatibility", {
    terraformCoreVersions: DEFAULT_TERRAFORM_COMPATIBILITY,
    lastUpdated: new Date().toISOString()
  });
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
  logger.error(`Error in ${toolName}:`, { error: errorMessage, context });

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          status: "error",
          error: errorMessage,
          context
        })
      }
    ]
  };
}

/**
 * Handle errors for resource list operations
 * @param error The error that occurred
 * @returns A standardized error response
 */
export function handleListError(error: any): any {
  logger.error("List error:", error);
  return {
    type: "error",
    error: {
      code: "list_failed",
      message: error?.message || "Failed to list resources"
    }
  };
}

/**
 * Handle errors for resource read operations
 * @param error The error that occurred
 * @returns A standardized error response
 */
export function handleResourceError(error: any): any {
  logger.error("Resource error:", error);
  return {
    type: "error",
    error: {
      code: "resource_error",
      message: error?.message || "Error processing resource"
    }
  };
}
