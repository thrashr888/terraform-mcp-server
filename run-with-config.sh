#!/bin/bash
# Script to run the Terraform MCP Server with custom environment variables

# Set environment variables
export LOG_LEVEL="debug"
export TERRAFORM_REGISTRY_URL="https://registry.terraform.io"
export DEFAULT_PROVIDER_NAMESPACE="hashicorp"
export REQUEST_TIMEOUT_MS="15000"
export RATE_LIMIT_ENABLED="false"

# Run the server
echo "Starting Terraform MCP Server with custom configuration..."
node dist/index.js

# To run in debug mode, uncomment the line below
# DEBUG=terraform-registry-mcp:* node dist/index.js