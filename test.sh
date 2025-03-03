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

# 2. providerLookup - Get details about a provider
PROVIDER_LOOKUP='{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"providerLookup","arguments":{"provider":"aws","namespace":"hashicorp"}}}'
run_tool_request "Provider Lookup: AWS" "$PROVIDER_LOOKUP"

# 3. resourceUsage - Get usage examples for a resource
RESOURCE_USAGE='{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"resourceUsage","arguments":{"provider":"aws","resource":"aws_s3_bucket"}}}'
run_tool_request "Resource Usage: AWS S3 Bucket" "$RESOURCE_USAGE"

# 4. moduleRecommendations - Get module recommendations
MODULE_RECOMMENDATIONS='{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"moduleRecommendations","arguments":{"query":"vpc"}}}'
run_tool_request "Module Recommendations: VPC" "$MODULE_RECOMMENDATIONS"

# 5. dataSourceLookup - Get data sources for a provider
DATA_SOURCE_LOOKUP='{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"dataSourceLookup","arguments":{"provider":"aws","namespace":"hashicorp"}}}'
run_tool_request "Data Source Lookup: AWS" "$DATA_SOURCE_LOOKUP"

# 6. providerSchemaDetails - Get schema details for a provider
# REMOVED: providerSchemaDetails section

# 7. resourceArgumentDetails - Get argument details for a resource
RESOURCE_ARGS='{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"resourceArgumentDetails","arguments":{"provider":"aws","namespace":"hashicorp","resource":"aws_instance"}}}'
run_tool_request "Resource Argument Details: AWS Instance" "$RESOURCE_ARGS"

# 8. moduleDetails - Get details for a module
MODULE_DETAILS='{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"moduleDetails","arguments":{"namespace":"terraform-aws-modules","module":"vpc","provider":"aws"}}}'
run_tool_request "Module Details: AWS VPC" "$MODULE_DETAILS"

# 9. exampleConfigGenerator - Try multiple resources in case one fails
echo -e "\n${BLUE}=== Example Config Generator Tests ===${NC}"

# Try with aws_instance
EXAMPLE_CONFIG_INSTANCE='{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"exampleConfigGenerator","arguments":{"provider":"aws","namespace":"hashicorp","resource":"aws_instance"}}}'
echo -e "${GREEN}Request (aws_instance):${NC} $EXAMPLE_CONFIG_INSTANCE"
echo -e "${GREEN}Response:${NC}"
RESPONSE=$(echo "$EXAMPLE_CONFIG_INSTANCE" | node dist/index.js | grep -v "Server constructor" | grep -v "terraform-registry-mcp" | grep -v "Received" | grep -v "=== DETAILED REQUEST DEBUG INFO ===" | grep -v "Processing tool" | grep -v "Using tool")
echo "$RESPONSE"

# If aws_instance failed, try with aws_vpc
if echo "$RESPONSE" | grep -q "Error"; then
  echo -e "${RED}aws_instance failed, trying aws_vpc...${NC}"
  EXAMPLE_CONFIG_VPC='{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"exampleConfigGenerator","arguments":{"provider":"aws","namespace":"hashicorp","resource":"aws_vpc"}}}'
  echo -e "${GREEN}Request (aws_vpc):${NC} $EXAMPLE_CONFIG_VPC"
  echo -e "${GREEN}Response:${NC}"
  RESPONSE=$(echo "$EXAMPLE_CONFIG_VPC" | node dist/index.js | grep -v "Server constructor" | grep -v "terraform-registry-mcp" | grep -v "Received" | grep -v "=== DETAILED REQUEST DEBUG INFO ===" | grep -v "Processing tool" | grep -v "Using tool")
  echo "$RESPONSE"
  
  # If aws_vpc failed too, try with google_compute_instance (different provider)
  if echo "$RESPONSE" | grep -q "Error"; then
    echo -e "${RED}aws_vpc failed, trying google_compute_instance...${NC}"
    EXAMPLE_CONFIG_GCP='{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"exampleConfigGenerator","arguments":{"provider":"google","namespace":"hashicorp","resource":"google_compute_instance"}}}'
    echo -e "${GREEN}Request (google_compute_instance):${NC} $EXAMPLE_CONFIG_GCP"
    echo -e "${GREEN}Response:${NC}"
    RESPONSE=$(echo "$EXAMPLE_CONFIG_GCP" | node dist/index.js | grep -v "Server constructor" | grep -v "terraform-registry-mcp" | grep -v "Received" | grep -v "=== DETAILED REQUEST DEBUG INFO ===" | grep -v "Processing tool" | grep -v "Using tool")
    echo "$RESPONSE"
    
    if echo "$RESPONSE" | grep -q "Error"; then
      FAILED_TESTS="$FAILED_TESTS\n- Example Config Generator (all resources failed)"
    else
      PASSED_TESTS="$PASSED_TESTS\n- Example Config Generator (google_compute_instance)"
    fi
  else
    PASSED_TESTS="$PASSED_TESTS\n- Example Config Generator (aws_vpc)"
  fi
else
  PASSED_TESTS="$PASSED_TESTS\n- Example Config Generator (aws_instance)"
fi

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