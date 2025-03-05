import { VERSION, RESPONSE_STATUS, DEFAULT_TERRAFORM_COMPATIBILITY } from '../config.js';
import logger from './logger.js';

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
): { content: Array<{type: string, text: string}> } {
  const response = {
    status,
    content,
    metadata: {
      ...metadata,
      timestamp: new Date().toISOString(),
      version: VERSION
    }
  };

  return { 
    content: [{ 
      type: "text", 
      text: JSON.stringify(response)
    }]
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
 * Helper function to sanitize and format URLs
 * @param url URL to format
 * @returns Properly formatted URL
 */
export function formatUrl(url: string): string {
  try {
    // Create URL object to validate and normalize
    const urlObj = new URL(url);
    return urlObj.toString();
  } catch (e) {
    // If URL parsing fails, return the original
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
 * Centralized error handler for all tools
 * @param toolName Name of the tool that encountered an error
 * @param error The error object
 * @param extraMetadata Additional metadata to include in the error response
 * @returns Standardized error response
 */
export function handleToolError(
  toolName: string, 
  error: Error | unknown, 
  extraMetadata: Record<string, any> = {}
): { content: Array<{type: string, text: string}> } {
  const errorMessage = error instanceof Error ? error.message : String(error);
  logger.error(`Error in ${toolName}:`, { error, toolName });
  
  const metadata = {
    tool: toolName,
    errorType: error instanceof Error ? error.constructor.name : 'UnknownError',
    ...extraMetadata
  };
  
  return createStandardResponse("error", errorMessage, metadata);
}