// Type definitions for the MCP server handlers

export interface ProviderLookupInput {
  namespace?: string;
  provider: string;
  version?: string;
  name?: string;       // fallback key if user uses { name: "aws" } etc.
}

export interface ResourceUsageInput {
  provider?: string;   // e.g. "aws"
  resource?: string;   // e.g. "aws_instance"
  name?: string;       // fallback
}

export interface ModuleRecommendationsInput {
  query?: string;      // e.g. "vpc"
  keyword?: string;    // fallback
  provider?: string;   // e.g. "aws"
}

export interface DataSourceLookupInput {
  provider: string;    // e.g. "aws"
  namespace: string;   // e.g. "hashicorp"
}

export interface ResourceArgumentDetailsInput {
  provider: string;    // e.g. "aws"
  namespace: string;   // e.g. "hashicorp"
  resource: string;    // e.g. "aws_instance"
}

export interface ModuleDetailsInput {
  namespace: string;   // e.g. "terraform-aws-modules"
  module: string;      // e.g. "vpc"
  provider: string;    // e.g. "aws"
}

// Schema types
export interface SchemaAttribute {
  type: string | object;
  description?: string;
  required?: boolean;
  computed?: boolean;
}

export interface ResourceSchema {
  block?: {
    attributes?: Record<string, SchemaAttribute>;
    block_types?: Record<string, BlockType>;
  };
}

export interface BlockType {
  description?: string;
  nesting_mode?: string;
  min_items?: number;
  max_items?: number;
  block?: {
    attributes?: Record<string, SchemaAttribute>;
  };
}

// Response types
export interface ResponseContent {
  content: Array<{ type: string; text: string }>;
  [key: string]: any; // Allow additional properties required by MCP SDK
}

// Handler type
export type ToolHandler<T> = (params: T) => Promise<ResponseContent>;

// Wrapper for tool request parameters
export interface ToolRequestParams {
  name?: string;
  tool?: string;
  arguments?: any;
  input?: any;
}