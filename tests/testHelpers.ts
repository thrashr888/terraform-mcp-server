import { jest } from "@jest/globals";

// Common mock for config.js
export const mockConfig = {
  TFC_TOKEN: "mock-token",
  TF_CLOUD_API_BASE: "https://app.terraform.io/api/v2",
  VERSION: "0.0.0-test",
  SERVER_NAME: "terraform-registry-mcp-test",
  REGISTRY_API_BASE: "https://registry.terraform.io",
  REGISTRY_API_V1: "https://registry.terraform.io/v1",
  REGISTRY_API_V2: "https://registry.terraform.io/v2",
  DEFAULT_NAMESPACE: "hashicorp",
  LOG_LEVEL: "error",
  LOG_LEVELS: {
    ERROR: "error",
    WARN: "warn",
    INFO: "info",
    DEBUG: "debug"
  },
  DEFAULT_TERRAFORM_COMPATIBILITY: "Terraform 0.12 and later",
  RESPONSE_STATUS: {
    SUCCESS: "success",
    ERROR: "error"
  },
  REQUEST_TIMEOUT_MS: 30000
};

// Helper to mock the config module
export const mockConfigModule = () => {
  jest.mock("../config", () => mockConfig);
};

// Helper to safely check if a URL includes a string
export const safeUrlIncludes = (url: any, searchString: string): boolean => {
  return typeof url === "string" && url.includes(searchString);
};

// Helper to create a mock implementation for fetchWithAuth
export const createMockFetchWithAuth = (mockImplementation: Function) => {
  return jest.fn().mockImplementation((...args: any[]) => {
    const url = args[0];
    const token = args[1];
    const options = args[2] || {};

    return mockImplementation(url, token, options);
  });
};

// Type-safe fetchWithAuth mock helper
export const createFetchWithAuthMock = () => {
  return jest.fn().mockImplementation(async (url) => {
    throw new Error(`Unhandled URL in test: ${url}`);
  });
};

// Helper to mock the hcpApiUtils module with a custom implementation
export const mockHcpApiUtils = (mockImplementation: Function) => {
  jest.mock("../utils/hcpApiUtils", () => ({
    fetchWithAuth: mockImplementation || createFetchWithAuthMock()
  }));
};
