import logger from "./logger.js";
import { REGISTRY_API_BASE, REGISTRY_API_V2, REQUEST_TIMEOUT_MS } from "../config.js";

// Add type imports for global types
type RequestInit = globalThis.RequestInit;

/**
 * Helper function to fetch data from a URL with timeout
 * @param url URL to fetch data from
 * @param options Fetch options
 * @returns Parsed JSON response or throws error
 */
export async function fetchData<T>(url: string, options: RequestInit = {}): Promise<T> {
  const controller = new globalThis.AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    logger.debug(`Fetching data from: ${url}`);
    
    try {
      // Merge options with signal from AbortController
      const fetchOptions = {
        ...options,
        signal: controller.signal
      };
      
      const response = await fetch(url, fetchOptions);
      
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
      }
      
      return await response.json() as T;
    } finally {
      // Clear the timeout regardless of success or failure
      clearTimeout(timeoutId);
    }
  } catch (error) {
    // Handle timeout errors specifically
    if (error instanceof Error && error.name === "AbortError") {
      logger.error(`Request to ${url} timed out after ${REQUEST_TIMEOUT_MS}ms`);
      throw new Error(`Request timed out after ${REQUEST_TIMEOUT_MS}ms`);
    }
    
    logger.error(`Error fetching data from ${url}:`, error);
    throw error;
  }
}

/**
 * Helper function to fetch documentation content from the Terraform Registry API
 * @param provider Provider name
 * @param resource Resource name
 * @returns Documentation content and ID or null if not found
 */
export async function fetchDocumentation(
  provider: string, 
  resource: string
): Promise<{content: string; docId: string} | null> {
  const controller = new globalThis.AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  
  try {
    // First, find the document ID by querying with filters
    const filterUrl = `${REGISTRY_API_V2}/provider-docs?filter%5Bcategory%5D=resources&filter%5Bslug%5D=${resource}&filter%5Blanguage%5D=hcl&page%5Bsize%5D=1`;
    
    logger.debug(`Fetching document ID from: ${filterUrl}`);
    const filterResponse = await fetch(filterUrl, { signal: controller.signal });
    
    if (!filterResponse.ok) {
      logger.error(`Failed to fetch document ID: ${filterResponse.status} ${filterResponse.statusText}`);
      return null;
    }
    
    const filterData = await filterResponse.json();
    
    if (!filterData.data || filterData.data.length === 0) {
      logger.warn(`No documentation found for resource: ${resource}`);
      return null;
    }
    
    const docId = filterData.data[0].id;
    
    // Now fetch the full documentation using the document ID
    const docUrl = `${REGISTRY_API_V2}/provider-docs/${docId}`;
    
    logger.debug(`Fetching documentation content from: ${docUrl}`);
    const docResponse = await fetch(docUrl, { signal: controller.signal });
    
    if (!docResponse.ok) {
      logger.error(`Failed to fetch documentation content: ${docResponse.status} ${docResponse.statusText}`);
      return null;
    }
    
    const docData = await docResponse.json();
    
    if (!docData.data || !docData.data.attributes || !docData.data.attributes.content) {
      logger.warn(`Documentation content not found for resource: ${resource}`);
      return null;
    }
    
    return {
      content: docData.data.attributes.content,
      docId: docId
    };
  } catch (error) {
    // Handle timeout errors specifically
    if (error instanceof Error && error.name === "AbortError") {
      logger.error(`Documentation request for ${provider}/${resource} timed out after ${REQUEST_TIMEOUT_MS}ms`);
    } else {
      logger.error("Error fetching documentation:", error);
    }
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Get the full URL to provider documentation
 * @param namespace Provider namespace
 * @param provider Provider name
 * @returns Formatted URL to provider documentation
 */
export function getProviderDocUrl(namespace: string, provider: string): string {
  return `${REGISTRY_API_BASE}/providers/${namespace}/${provider}`;
}

/**
 * Get the full URL to resource documentation
 * @param namespace Provider namespace
 * @param provider Provider name
 * @param resource Resource name
 * @returns Formatted URL to resource documentation
 */
export function getResourceDocUrl(namespace: string, provider: string, resource: string): string {
  return `${REGISTRY_API_BASE}/providers/${namespace}/${provider}/latest/docs/resources/${resource}`;
}

/**
 * Get the full URL to module documentation
 * @param namespace Module namespace
 * @param module Module name
 * @param provider Provider name
 * @returns Formatted URL to module documentation
 */
export function getModuleDocUrl(namespace: string, module: string, provider: string): string {
  return `${REGISTRY_API_BASE}/modules/${namespace}/${module}/${provider}`;
}