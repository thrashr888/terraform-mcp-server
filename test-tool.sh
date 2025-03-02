#!/bin/bash

# Test script for a single terraform-mcp-server tool
# Usage: ./test-tool.sh toolName "param1=value1" "param2=value2" ...

if [ $# -lt 1 ]; then
  echo "Usage: $0 toolName [param1=value1 param2=value2 ...]"
  echo ""
  echo "Available tools:"
  echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | npx -y terraform-mcp-server | grep -o '"name":"[^"]*"' | cut -d '"' -f 4 | sort
  exit 1
fi

TOOL_NAME=$1
shift

# Build the arguments JSON
ARGS="{"
for param in "$@"; do
  KEY=$(echo $param | cut -d= -f1)
  VALUE=$(echo $param | cut -d= -f2-)
  
  # If the value looks like a number, don't quote it
  if [[ $VALUE =~ ^[0-9]+$ ]]; then
    ARGS="$ARGS\"$KEY\":$VALUE,"
  else
    ARGS="$ARGS\"$KEY\":\"$VALUE\","
  fi
done

# Remove the trailing comma if there are arguments
if [ "$ARGS" != "{" ]; then
  ARGS=${ARGS%?}
fi

ARGS="$ARGS}"

# If no arguments were provided, use empty object
if [ "$ARGS" = "{}" ]; then
  REQUEST='{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"'$TOOL_NAME'","arguments":{}}}'
else
  REQUEST='{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"'$TOOL_NAME'","arguments":'$ARGS'}}'
fi

echo "=== Testing tool: $TOOL_NAME ==="
echo "Arguments: $ARGS"
echo "Request: $REQUEST"
echo ""
echo "Response:"
RESPONSE=$(echo "$REQUEST" | npx -y terraform-mcp-server | grep -v "Server constructor" | grep -v "terraform-registry-mcp" | grep -v "Received" | grep -v "=== DETAILED REQUEST DEBUG INFO ===" | grep -v "Processing tool" | grep -v "Using tool")
echo "$RESPONSE"

# Check if there was an error
if echo "$RESPONSE" | grep -q "Error"; then
  echo ""
  echo "TEST FAILED! The tool returned an error."
  exit 1
else
  echo ""
  echo "TEST PASSED! The tool executed successfully."
fi

echo ""
echo "=== Test complete ==="

# Examples:
# ./test-tool.sh providerLookup "provider=aws" "namespace=hashicorp"
# ./test-tool.sh moduleRecommendations "query=vpc"
# ./test-tool.sh resourceArgumentDetails "provider=aws" "namespace=hashicorp" "resource=aws_instance"
# ./test-tool.sh exampleConfigGenerator "provider=aws" "namespace=hashicorp" "resource=aws_instance" 