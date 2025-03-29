/**
 * Terraform Cloud resource handlers
 */

import { TFC_TOKEN } from "../../config.js";
import { handleListOrganizations } from "../tools/organizations.js";
import { handleListWorkspaces, handleShowWorkspace } from "../tools/workspaces.js";
import { handleListWorkspaceResources } from "../tools/workspaceResources.js";
import { ResourceHandler } from "./index.js";
import logger from "../utils/logger.js";

// Check if Terraform Cloud token is available
const hasTfcToken = !!TFC_TOKEN;

/**
 * List organizations handler
 */
async function listOrganizations() {
  logger.debug(`TFC_TOKEN availability: ${!!TFC_TOKEN}`);

  if (!hasTfcToken) {
    return {
      type: "error",
      error: {
        code: "unauthorized",
        message: "Terraform Cloud token not configured"
      }
    };
  }

  try {
    const result = await handleListOrganizations({});
    logger.debug(`Organizations result: ${JSON.stringify(result)}`);

    // The organizations data is nested in the response structure
    let orgs = [];

    if (result.content && Array.isArray(result.content) && result.content.length > 0) {
      try {
        // Parse the response structure to extract organizations
        const responseData = JSON.parse(result.content[0].text);
        logger.debug(`Parsed response: ${JSON.stringify(responseData)}`);

        if (responseData.metadata && responseData.metadata.organizations) {
          orgs = responseData.metadata.organizations;
        }
      } catch (parseError) {
        logger.error("Error parsing organization data:", parseError);
      }
    }

    logger.debug(`Extracted organizations: ${JSON.stringify(orgs)}`);

    if (!orgs || orgs.length === 0) {
      return {
        type: "success",
        resources: []
      };
    }

    // Extract organizations from the result and map them to resources
    return {
      type: "success",
      resources: orgs.map((org: any) => ({
        uri: `terraform://organizations/${org.name}`,
        title: org.name,
        description: `Terraform Cloud organization: ${org.name}`
      }))
    };
  } catch (error) {
    logger.error("Error listing organizations:", error);
    return {
      type: "success",
      resources: [] // Return empty list instead of error to be more resilient
    };
  }
}

/**
 * List workspaces handler
 */
async function listWorkspaces(uri: string, params: Record<string, string>) {
  if (!hasTfcToken) {
    return {
      type: "error",
      error: {
        code: "unauthorized",
        message: "Terraform Cloud token not configured"
      }
    };
  }

  try {
    const { org } = params;
    const result = await handleListWorkspaces({ organization: org });
    logger.debug(`Workspaces result: ${JSON.stringify(result)}`);

    // The workspaces data is nested in the response structure
    let workspaces = [];

    if (result.content && Array.isArray(result.content) && result.content.length > 0) {
      try {
        // Parse the response structure to extract workspaces
        const responseData = JSON.parse(result.content[0].text);
        logger.debug(`Parsed response: ${JSON.stringify(responseData)}`);

        if (responseData.metadata && responseData.metadata.workspaces) {
          workspaces = responseData.metadata.workspaces;
        }
      } catch (parseError) {
        logger.error("Error parsing workspace data:", parseError);
      }
    }

    logger.debug(`Extracted workspaces: ${JSON.stringify(workspaces)}`);

    if (!workspaces || workspaces.length === 0) {
      return {
        type: "success",
        resources: []
      };
    }

    return {
      type: "success",
      resources: workspaces.map((workspace: any) => ({
        uri: `terraform://organizations/${org}/workspaces/${workspace.id}`,
        title: workspace.name,
        description: `Workspace: ${workspace.name}`
      }))
    };
  } catch (error) {
    logger.error("Error listing workspaces:", error);
    return {
      type: "success",
      resources: []
    };
  }
}

/**
 * Show workspace details handler
 */
async function showWorkspace(uri: string, params: Record<string, string>) {
  if (!hasTfcToken) {
    return {
      type: "error",
      error: {
        code: "unauthorized",
        message: "Terraform Cloud token not configured"
      }
    };
  }

  const { org, workspace } = params;
  logger.debug(`Fetching workspace details for org: ${org}, workspace: ${workspace}`);

  try {
    // If workspace starts with "ws-", it's an ID, so we need to get the name first
    const workspaceName = workspace;

    if (workspace.startsWith("ws-")) {
      // For now we'll just provide basic info since we don't have a lookup by ID endpoint
      logger.debug(`Workspace ID detected: ${workspace}. Using fallback response.`);

      // The proper solution would be to first list all workspaces and find the name for this ID
      // But for now we'll just return a fallback response
      return {
        type: "success",
        resource: {
          uri,
          title: workspace,
          description: `Terraform Cloud workspace: ${workspace}`,
          content: `## Workspace: ${workspace}\n\nThis workspace was accessed by ID. To view full details, please use the workspace name instead of ID.`,
          properties: {
            id: workspace,
            organization: org
          }
        }
      };
    }

    const result = await handleShowWorkspace({
      organization_name: org,
      name: workspaceName
    });

    // The workspace data is nested in the response structure
    let workspaceData: Record<string, any> = {};
    let markdown = "";

    if (result.content && Array.isArray(result.content) && result.content.length > 0) {
      try {
        // Parse the response structure
        const responseData = JSON.parse(result.content[0].text);
        logger.debug(`Parsed response: ${JSON.stringify(responseData)}`);

        if (responseData.metadata && responseData.metadata.workspace) {
          workspaceData = responseData.metadata.workspace;
        }
        if (responseData.content) {
          markdown = responseData.content;
        }
      } catch (parseError) {
        logger.error("Error parsing workspace data:", parseError);
      }
    }

    return {
      type: "success",
      resource: {
        uri,
        title: workspaceData.name || workspaceName,
        description: `Terraform Cloud workspace: ${workspaceData.name || workspaceName}`,
        content: markdown || `## Workspace: ${workspaceName}\n\nWorkspace details could not be retrieved.`,
        properties: workspaceData
      }
    };
  } catch (error) {
    logger.error(`Error getting workspace details for ${org}/${workspace}:`, error);

    // Return basic workspace info even if lookup fails
    return {
      type: "success",
      resource: {
        uri,
        title: workspace,
        description: `Terraform Cloud workspace: ${workspace}`,
        content: `## Workspace: ${workspace}\n\nWorkspace details could not be retrieved.`,
        properties: {
          name: workspace,
          organization: org
        }
      }
    };
  }
}

/**
 * List workspace resources handler
 */
async function listWorkspaceResources(uri: string, params: Record<string, string>) {
  if (!hasTfcToken) {
    return {
      type: "error",
      error: {
        code: "unauthorized",
        message: "Terraform Cloud token not configured"
      }
    };
  }

  const { org, workspace } = params;

  try {
    // First, we need to get the workspace ID if a name was provided
    let workspaceId = workspace;

    // If the workspace parameter is not an ID (doesn't start with "ws-"),
    // we need to look up the workspace by name to get its ID
    if (!workspace.startsWith("ws-")) {
      logger.debug(`Workspace name detected: ${workspace}. Need to look up ID first.`);

      // Get the workspace details to find its ID
      try {
        const workspacesResult = await handleListWorkspaces({ organization: org });

        if (
          workspacesResult.content &&
          Array.isArray(workspacesResult.content) &&
          workspacesResult.content.length > 0
        ) {
          try {
            // Parse the response structure to extract workspaces
            const responseData = JSON.parse(workspacesResult.content[0].text);

            if (responseData.metadata && responseData.metadata.workspaces) {
              const workspaces = responseData.metadata.workspaces;
              const matchingWorkspace = workspaces.find((ws: any) => ws.name === workspace);

              if (matchingWorkspace) {
                workspaceId = matchingWorkspace.id;
                logger.debug(`Found workspace ID: ${workspaceId} for workspace name: ${workspace}`);
              } else {
                logger.error(`Could not find workspace with name: ${workspace}`);
                return {
                  type: "success",
                  resources: []
                };
              }
            }
          } catch (parseError) {
            logger.error("Error parsing workspace data:", parseError);
          }
        }
      } catch (lookupError) {
        logger.error(`Error looking up workspace ID for ${workspace}:`, lookupError);
        return {
          type: "success",
          resources: []
        };
      }
    }

    const result = await handleListWorkspaceResources({ workspace_id: workspaceId });
    logger.debug(`Workspace resources result: ${JSON.stringify(result)}`);

    // The resources data is nested in the response structure
    let resources = [];

    if (result.content && Array.isArray(result.content) && result.content.length > 0) {
      try {
        // Parse the response structure to extract resources
        const responseData = JSON.parse(result.content[0].text);
        logger.debug(`Parsed response: ${JSON.stringify(responseData)}`);

        if (responseData.metadata && responseData.metadata.resources) {
          resources = responseData.metadata.resources;
        }
      } catch (parseError) {
        logger.error("Error parsing resources data:", parseError);
      }
    }

    logger.debug(`Extracted resources: ${JSON.stringify(resources)}`);

    if (!resources || resources.length === 0) {
      return {
        type: "success",
        resources: []
      };
    }

    return {
      type: "success",
      resources: resources.map((resource: any) => ({
        uri: `terraform://organizations/${org}/workspaces/${workspace}/resources/${resource.id}`,
        title: resource.name || resource.address,
        description: `Resource: ${resource.address}`
      }))
    };
  } catch (error) {
    logger.error(`Error listing workspace resources for ${org}/${workspace}:`, error);
    return {
      type: "success",
      resources: [] // Return empty list instead of error to be more resilient
    };
  }
}

// Define all Terraform Cloud resource handlers
export const TerraformCloudResources: ResourceHandler[] = [
  {
    uriPattern: "terraform://organizations",
    handler: listOrganizations
  },
  {
    uriPattern: "terraform://organizations/{org}/workspaces",
    handler: listWorkspaces
  },
  {
    uriPattern: "terraform://organizations/{org}/workspaces/{workspace}",
    handler: showWorkspace
  },
  {
    uriPattern: "terraform://organizations/{org}/workspaces/{workspace}/resources",
    handler: listWorkspaceResources
  }
];
