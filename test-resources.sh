#!/bin/bash

# Test script for terraform-mcp-server resources implementation
# This script tests both the resource usage handler and the new resources API

echo "=== Testing terraform-mcp-server Resources Implementation ==="
echo "==========================================================="

# Build the project first
echo "Building project..."
npm run build > /dev/null

# Function to run a resource list test
test_resource_list() {
  local uri=$1
  local description=$2

  echo ""
  echo "=== Testing resources/list: $description ($uri) ==="
  
  # Create JSON-RPC request for resources/list
  local request="{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"resources/list\",\"params\":{\"uri\":\"$uri\"}}"
  
  echo "Request URI: $uri"
  
  # Pipe request to server and filter log messages
  local response=$(echo "$request" | node dist/index.js | grep -v "Server constructor" | grep -v "terraform-registry-mcp" | grep -v "Received")
  
  # Display brief content preview
  echo "Content preview:"
  echo "$response" | head -c 300
  echo "..."
  
  # Check for errors
  if echo "$response" | grep -q "error"; then
    echo -e "\nTEST FAILED: $uri"
    failed=$((failed + 1))
    return 1
  else
    echo -e "\nTEST PASSED: $uri"
    passed=$((passed + 1))
    return 0
  fi
}

# Function to run a resource read test
test_resource_read() {
  local uri=$1
  local description=$2

  echo ""
  echo "=== Testing resources/read: $description ($uri) ==="
  
  # Create JSON-RPC request for resources/read
  local request="{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"resources/read\",\"params\":{\"uri\":\"$uri\"}}"
  
  echo "Request URI: $uri"
  
  # Pipe request to server and filter log messages
  local response=$(echo "$request" | node dist/index.js | grep -v "Server constructor" | grep -v "terraform-registry-mcp" | grep -v "Received")
  
  # Display brief content preview
  echo "Content preview:"
  echo "$response" | head -c 300
  echo "..."
  
  # Check for errors
  if echo "$response" | grep -q "error"; then
    echo -e "\nTEST FAILED: $uri"
    failed=$((failed + 1))
    return 1
  else
    echo -e "\nTEST PASSED: $uri"
    passed=$((passed + 1))
    return 0
  fi
}

# Track test results
passed=0
failed=0

# Test registry resources
test_resource_list "registry://providers" "List providers"
test_resource_list "registry://providers/hashicorp/aws/data-sources" "List AWS data sources"
test_resource_read "registry://providers/hashicorp/aws" "Read AWS provider details"
test_resource_read "registry://providers/hashicorp/aws/resources/aws_instance" "Read AWS instance resource"
test_resource_list "registry://modules" "List modules"

# Test TFC resources (these might fail if TFC_TOKEN is not set)
test_resource_list "terraform://organizations" "List organizations"

# Also test original resource usage handler for compatibility
echo ""
echo "=== Testing original resourceUsage handler ==="
request="{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"resourceUsage\",\"arguments\":{\"provider\":\"aws\",\"resource\":\"aws_s3_bucket\"}}}"
response=$(echo "$request" | node dist/index.js | grep -v "Server constructor" | grep -v "terraform-registry-mcp" | grep -v "Received")
echo "Content preview:"
echo "$response" | head -c 300
echo "..."

# Show summary
echo ""
echo "=== Test Summary ==="
echo "Passed: $passed"
echo "Failed: $failed"
echo "Total: $((passed + failed))"

# Exit with failure if any tests failed
if [ $failed -gt 0 ]; then
  exit 1
fi 