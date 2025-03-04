#!/bin/bash

# Basic test script for terraform-mcp-server resource usage handler
# This script tests a minimal set of resources to verify functionality

echo "=== Testing terraform-mcp-server Resource Usage Handler ==="
echo "=========================================================="

# Build the project first
echo "Building project..."
npm run build > /dev/null

# Function to run a resource usage test
test_resource() {
  local provider=$1
  local resource=$2
  local description=$3

  echo ""
  echo "=== Testing $description ($provider/$resource) ==="
  
  # Create JSON-RPC request
  local request="{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"resourceUsage\",\"arguments\":{\"provider\":\"$provider\",\"resource\":\"$resource\"}}}"
  
  echo "Request: $resource"
  
  # Pipe request to server and filter log messages
  local response=$(echo "$request" | node dist/index.js | grep -v "Server constructor" | grep -v "terraform-registry-mcp" | grep -v "Received" | grep -v "=== DETAILED REQUEST DEBUG INFO ===" | grep -v "Processing tool" | grep -v "Using tool")
  
  # Display brief content preview
  echo "Content preview:"
  echo "$response" | head -c 300
  echo "..."
  
  # Check for errors
  if echo "$response" | grep -q "Error"; then
    echo -e "\nTEST FAILED: $provider/$resource"
    return 1
  else
    echo -e "\nTEST PASSED: $provider/$resource"
    return 0
  fi
}

# Track test results
passed=0
failed=0

# Test only the most essential resources - one AWS and one Google
run_test() {
  if test_resource "$1" "$2" "$3"; then
    passed=$((passed + 1))
  else
    failed=$((failed + 1))
  fi
}

# Test AWS resources
test_resource "aws" "aws_s3_bucket" "AWS S3 Bucket"
test_resource "aws" "aws_api_gateway_account" "AWS API Gateway Account"
test_resource "aws" "aws_lambda_function" "AWS Lambda Function"
test_resource "aws" "aws_instance" "AWS EC2 Instance"
test_resource "aws" "aws_vpc" "AWS VPC"

# Test other cloud providers
test_resource "google" "google_compute_instance" "Google Compute Instance"
test_resource "azurerm" "azurerm_resource_group" "Azure Resource Group"

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