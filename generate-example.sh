#!/bin/bash

# Quick CLI script to test the exampleConfigGenerator tool
# Usage: ./generate-example.sh [namespace] [provider] [resource]
# Example: ./generate-example.sh hashicorp aws aws_instance

if [ $# -lt 3 ]; then
  echo "Usage: $0 namespace provider resource"
  echo "Example: $0 hashicorp aws aws_instance"
  exit 1
fi

NAMESPACE=$1
PROVIDER=$2
RESOURCE=$3

echo "Generating example configuration for $NAMESPACE/$PROVIDER/$RESOURCE..."

REQUEST='{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"exampleConfigGenerator","arguments":{"namespace":"'$NAMESPACE'","provider":"'$PROVIDER'","resource":"'$RESOURCE'"}}}'

echo "$REQUEST" | node dist/index.js | grep -v "Server constructor" | grep -v "terraform-registry-mcp" | grep -v "Received" | grep -v "=== DETAILED REQUEST DEBUG INFO ===" | grep -v "Processing tool" | grep -v "Using tool" | jq -r '.result.content[0].text' | jq -r '.example_configuration'

exit_code=$?
if [ $exit_code -ne 0 ]; then
  echo "Error generating example configuration."
  exit $exit_code
fi 