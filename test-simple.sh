#!/bin/bash

# Simple test script for terraform-mcp-server
# This script demonstrates how to use each available tool with a one-liner
# This version doesn't require jq

echo "=== Testing terraform-mcp-server MCP Tools ==="
echo "============================================="

# Function to run a tool request
run_tool() {
  local name=$1
  local json=$2
  
  echo ""
  echo "=== Testing $name ==="
  echo "Request: $json"
  echo "Response:"
  RESPONSE=$(echo "$json" | npx -y terraform-mcp-server | grep -v "Server constructor" | grep -v "terraform-registry-mcp" | grep -v "Received" | grep -v "=== DETAILED REQUEST DEBUG INFO ===" | grep -v "Processing tool" | grep -v "Using tool")
  echo "$RESPONSE"
  
  # Check if there was an error
  if echo "$RESPONSE" | grep -q "Error"; then
    echo "TEST FAILED!"
    FAILED_TESTS="$FAILED_TESTS\n- $name"
  else
    PASSED_TESTS="$PASSED_TESTS\n- $name"
  fi
  
  echo "======================="
}

# Initialize test tracking
PASSED_TESTS=""
FAILED_TESTS=""

# 1. List all available tools
LIST_TOOLS='{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
echo ""
echo "=== Listing All Available Tools ==="
echo "Request: $LIST_TOOLS"
echo "Response: (Showing condensed output for readability)"
echo "$LIST_TOOLS" | npx -y terraform-mcp-server | grep -o '"name":"[^"]*"' | sort | uniq
echo "======================="

# 2. Test each tool with an example
run_tool "Provider Lookup" '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"providerLookup","arguments":{"provider":"aws","namespace":"hashicorp"}}}'

run_tool "Resource Usage" '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"resourceUsage","arguments":{"provider":"aws","resource":"aws_s3_bucket"}}}'

run_tool "Module Recommendations" '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"moduleRecommendations","arguments":{"query":"vpc"}}}'

run_tool "Data Source Lookup" '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"dataSourceLookup","arguments":{"provider":"aws","namespace":"hashicorp"}}}'

run_tool "Provider Schema Details" '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"providerSchemaDetails","arguments":{"provider":"aws","namespace":"hashicorp"}}}'

run_tool "Resource Argument Details" '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"resourceArgumentDetails","arguments":{"provider":"aws","namespace":"hashicorp","resource":"aws_instance"}}}'

run_tool "Module Details" '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"moduleDetails","arguments":{"namespace":"terraform-aws-modules","module":"vpc","provider":"aws"}}}'

run_tool "Example Config Generator" '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"exampleConfigGenerator","arguments":{"provider":"aws","namespace":"hashicorp","resource":"aws_instance"}}}'

echo ""
echo "All tests completed!"

# Show test summary
echo ""
echo "=== Test Summary ==="
if [ -n "$PASSED_TESTS" ]; then
  echo "Passed tests:$PASSED_TESTS"
fi

if [ -n "$FAILED_TESTS" ]; then
  echo "Failed tests:$FAILED_TESTS"
fi 