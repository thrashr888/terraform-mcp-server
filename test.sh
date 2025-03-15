#!/bin/bash

# Test script for terraform-mcp-server
# This script demonstrates how to use each available tool with a one-liner

# Set text colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to run a tool request and format the output
run_tool_request() {
  local title=$1
  local request=$2
  
  echo -e "\n${BLUE}=== $title ===${NC}"
  echo -e "${GREEN}Request:${NC} $request"
  echo -e "${GREEN}Response:${NC}"
  RESPONSE=$(echo "$request" | node dist/index.js | grep -v "Server constructor" | grep -v "terraform-registry-mcp" | grep -v "Received" | grep -v "=== DETAILED REQUEST DEBUG INFO ===" | grep -v "Processing tool" | grep -v "Using tool")
  echo "$RESPONSE"
  
  # Check if there was an error
  if echo "$RESPONSE" | grep -q "Error"; then
    echo -e "${RED}Test failed!${NC}"
    FAILED_TESTS="$FAILED_TESTS\n- $title"
  else
    PASSED_TESTS="$PASSED_TESTS\n- $title"
  fi
  
  echo -e "${BLUE}====================================${NC}\n"
}

# Initialize test tracking
PASSED_TESTS=""
FAILED_TESTS=""

echo -e "${BLUE}Testing terraform-mcp-server MCP Tools${NC}"
echo -e "${BLUE}====================================${NC}"

# 1. List all available tools
echo -e "\n${BLUE}=== Listing All Available Tools ===${NC}"
TOOLS_LIST_REQUEST='{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
echo -e "${GREEN}Request:${NC} $TOOLS_LIST_REQUEST"
echo -e "${GREEN}Response:${NC}"
echo "$TOOLS_LIST_REQUEST" | node dist/index.js | grep "\"result\"" | jq .
echo -e "${BLUE}====================================${NC}\n"

# 2. providerDetails - Get details about a provider
PROVIDER_LOOKUP='{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"providerDetails","arguments":{"provider":"aws","namespace":"hashicorp"}}}'
run_tool_request "Provider Details: AWS" "$PROVIDER_LOOKUP"

# 3. resourceUsage - Get usage examples for a resource
RESOURCE_USAGE='{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"resourceUsage","arguments":{"provider":"aws","resource":"aws_s3_bucket"}}}'
run_tool_request "Resource Usage: AWS S3 Bucket" "$RESOURCE_USAGE"

# 4. moduleSearch - Get module recommendations
MODULE_RECOMMENDATIONS='{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"moduleSearch","arguments":{"query":"vpc"}}}'
run_tool_request "Module Search: VPC" "$MODULE_RECOMMENDATIONS"

# 5. listDataSources - Get data sources for a provider
DATA_SOURCE_LOOKUP='{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"listDataSources","arguments":{"provider":"aws","namespace":"hashicorp"}}}'
run_tool_request "List Data Sources: AWS" "$DATA_SOURCE_LOOKUP"

# 6. resourceArgumentDetails - Get argument details for a resource
RESOURCE_ARGS='{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"resourceArgumentDetails","arguments":{"provider":"aws","namespace":"hashicorp","resource":"aws_instance"}}}'
run_tool_request "Resource Argument Details: AWS Instance" "$RESOURCE_ARGS"

# 7. moduleDetails - Get details for a module
MODULE_DETAILS='{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"moduleDetails","arguments":{"namespace":"terraform-aws-modules","module":"vpc","provider":"aws"}}}'
run_tool_request "Module Details: AWS VPC" "$MODULE_DETAILS"

# 8. functionDetails - Get details about a provider function
FUNCTION_DETAILS='{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"functionDetails","arguments":{"provider":"aws","function":"cidrsubnet","namespace":"hashicorp"}}}'
run_tool_request "Function Details: AWS cidrsubnet" "$FUNCTION_DETAILS"

# 9. providerGuides - Get provider guides
PROVIDER_GUIDES='{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"providerGuides","arguments":{"provider":"aws","namespace":"hashicorp"}}}'
run_tool_request "Provider Guides: AWS" "$PROVIDER_GUIDES"

# 10. policySearch - Search for policy libraries
POLICY_SEARCH='{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"policySearch","arguments":{"query":"security"}}}'
run_tool_request "Policy Search: Security" "$POLICY_SEARCH"

# 11. policyDetails - Get details for a policy library
POLICY_DETAILS='{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"policyDetails","arguments":{"namespace":"hashicorp","name":"CIS-Policy-Set-for-AWS-S3-Terraform"}}}'
run_tool_request "Policy Details: HashiCorp CIS AWS S3 Policy" "$POLICY_DETAILS"

echo -e "${BLUE}====================================${NC}\n"

echo -e "${BLUE}All tests completed!${NC}"

# Show test summary
echo -e "\n${BLUE}=== Test Summary ===${NC}"
if [ -n "$PASSED_TESTS" ]; then
  echo -e "${GREEN}Passed tests:${NC}$PASSED_TESTS"
fi

if [ -n "$FAILED_TESTS" ]; then
  echo -e "${RED}Failed tests:${NC}$FAILED_TESTS"
fi 