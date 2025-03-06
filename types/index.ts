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

export interface ResourceUsageResponse {
  description: string;
  subcategory: string;
  examples: Array<{
    name: string;
    description: string;
    code: string;
  }>;
  notes: Array<string>;
  import_instructions: string;
  related_docs: Array<{
    title: string;
    url: string;
  }>;
  version: string;
  latestVersion: string;
  documentationUrl: string;
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

export interface ResourceDocumentationInput {
  namespace: string;
  provider: string;
  resource: string;
  version?: string;  // Optional version, defaults to "latest"
}

export interface ProviderVersion {
  id: string;
  attributes: {
    version: string;
    protocols: string[];
    "published-at": string;
  };
}

export interface ResourceDoc {
  id: string;
  attributes: {
    title: string;
    slug: string;
    category: string;
    subcategory: string;
    description: string;
    language: string;
    content: string;
  };
}

export interface ResourceDocumentationResponse {
  // Basic information
  content: string;
  docId: string;
  version: string;
  latestVersion: string;
  documentationUrl: string;
  description: string;
  subcategory: string;

  // Examples
  examples: Array<{
    name: string;
    description: string;
    code: string;
  }>;

  // Arguments
  arguments: {
    required: Array<{
      name: string;
      type: string;
      description: string;
    }>;
    optional: Array<{
      name: string;
      type: string;
      description: string;
    }>;
  };

  // Attributes
  attributes: Array<{
    name: string;
    type: string;
    description: string;
    computed: boolean;
  }>;

  // Nested blocks
  nestedBlocks: Array<{
    name: string;
    description: string;
    arguments: Array<{
      name: string;
      type: string;
      description: string;
      required: boolean;
    }>;
  }>;

  // Import
  importInstructions?: {
    syntax: string;
    examples: string[];
  };
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