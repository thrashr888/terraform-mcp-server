// Configuration constants for the Terraform MCP Server

// Static version - updated during release process
export const VERSION = "0.9.7";
export const SERVER_NAME = "terraform-registry-mcp";

// Terraform Registry API URLs
export const REGISTRY_API_BASE = process.env.TERRAFORM_REGISTRY_URL || "https://registry.terraform.io";
export const REGISTRY_API_V1 = `${REGISTRY_API_BASE}/v1`;
export const REGISTRY_API_V2 = `${REGISTRY_API_BASE}/v2`;

// Default namespace for providers when not specified
export const DEFAULT_NAMESPACE = process.env.DEFAULT_PROVIDER_NAMESPACE || "hashicorp";

// Logging configuration
export const LOG_LEVEL = process.env.LOG_LEVEL || "info"; // Default log level
export const LOG_LEVELS = {
  ERROR: "error",
  WARN: "warn", 
  INFO: "info",
  DEBUG: "debug"
};

// Default compatibility info
export const DEFAULT_TERRAFORM_COMPATIBILITY = process.env.DEFAULT_TERRAFORM_COMPATIBILITY || "Terraform 0.12 and later";

// Response statuses
export const RESPONSE_STATUS = {
  SUCCESS: "success",
  ERROR: "error"
};

// Rate limiting configuration
export const RATE_LIMIT_ENABLED = process.env.RATE_LIMIT_ENABLED === "true";
export const RATE_LIMIT_REQUESTS = parseInt(process.env.RATE_LIMIT_REQUESTS || "60", 10);
export const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10);

// Request timeouts in milliseconds
export const REQUEST_TIMEOUT_MS = parseInt(process.env.REQUEST_TIMEOUT_MS || "10000", 10);