#!/bin/bash

# Test script for terraform-mcp-server TFC tools
# This script demonstrates how to use each Terraform Cloud related tool

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
  
  # Return the response for potential capture
  echo "$RESPONSE"
}

# Initialize test tracking
PASSED_TESTS=""
FAILED_TESTS=""

echo -e "${BLUE}Testing terraform-mcp-server TFC Tools${NC}"
echo -e "${BLUE}====================================${NC}"

# 1. listOrganizations - List organizations
LIST_ORGS='{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"listOrganizations","arguments":{}}}'
run_tool_request "List Organizations" "$LIST_ORGS"

# 2. privateModuleSearch - Search for private modules
PRIVATE_MODULE_SEARCH='{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"privateModuleSearch","arguments":{"organization":"pthrasher_v2","query":"vpc"}}}'
run_tool_request "Private Module Search" "$PRIVATE_MODULE_SEARCH"

# 3. privateModuleDetails - Get details for a private module
PRIVATE_MODULE_DETAILS='{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"privateModuleDetails","arguments":{"organization":"pthrasher_v2","namespace":"pthrasher_v2","name":"s3-website","provider":"aws"}}}'
run_tool_request "Private Module Details" "$PRIVATE_MODULE_DETAILS"

# 4. explorerQuery - Query the Explorer API
EXPLORER_QUERY='{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"explorerQuery","arguments":{"organization":"pthrasher_v2","type":"workspaces"}}}'
run_tool_request "Explorer Query" "$EXPLORER_QUERY"

# 5. listWorkspaces - List workspaces
LIST_WORKSPACES='{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"listWorkspaces","arguments":{"organization":"pthrasher_v2"}}}'
run_tool_request "List Workspaces" "$LIST_WORKSPACES"

# 6. workspaceDetails - Get workspace details
SHOW_WORKSPACE='{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"workspaceDetails","arguments":{"organization":"pthrasher_v2","name":"cool-website"}}}'
run_tool_request "Workspace Details" "$SHOW_WORKSPACE"

# 7. lockWorkspace - Lock a workspace
LOCK_WORKSPACE='{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"lockWorkspace","arguments":{"workspace_id":"ws-oXwyb8BweA2SssLk","reason":"Testing lock functionality"}}}'
run_tool_request "Lock Workspace" "$LOCK_WORKSPACE"

# 8. unlockWorkspace - Unlock a workspace
UNLOCK_WORKSPACE='{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"unlockWorkspace","arguments":{"workspace_id":"ws-oXwyb8BweA2SssLk"}}}'
run_tool_request "Unlock Workspace" "$UNLOCK_WORKSPACE"

# 9. listRuns - List runs for a workspace
LIST_RUNS='{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"listRuns","arguments":{"workspace_id":"ws-oXwyb8BweA2SssLk"}}}'
run_tool_request "List Runs" "$LIST_RUNS"

# 10. runDetails - Get run details
SHOW_RUN='{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"runDetails","arguments":{"run_id":"run-UQAxKgYo3g5LqJ94"}}}'
run_tool_request "Run Details" "$SHOW_RUN"

# 11. createRun - Create a new run
CREATE_RUN='{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"createRun","arguments":{"workspace_id":"ws-oXwyb8BweA2SssLk","message":"Test run from MCP"}}}'
CREATE_RUN_RESPONSE=$(run_tool_request "Create Run" "$CREATE_RUN")

# Extract the run ID from the createRun response
NEW_RUN_ID=$(echo "$CREATE_RUN_RESPONSE" | grep -o '"id":"run-[^"]*"' | head -1 | cut -d'"' -f4)
echo -e "${BLUE}Created new run with ID: $NEW_RUN_ID${NC}"

# 12. applyRun - Apply a run (using the newly created run)
APPLY_RUN='{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"applyRun","arguments":{"run_id":"'$NEW_RUN_ID'","comment":"Applying test run"}}}'
run_tool_request "Apply Run" "$APPLY_RUN"

# 13. cancelRun - Cancel a run (using the newly created run)
CANCEL_RUN='{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"cancelRun","arguments":{"run_id":"'$NEW_RUN_ID'","comment":"Cancelling test run"}}}'
run_tool_request "Cancel Run" "$CANCEL_RUN"

# 14. listWorkspaceResources - List resources in a workspace
LIST_RESOURCES='{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"listWorkspaceResources","arguments":{"workspace_id":"ws-oXwyb8BweA2SssLk"}}}'
run_tool_request "List Workspace Resources" "$LIST_RESOURCES"

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