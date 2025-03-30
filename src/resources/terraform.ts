/**
 * Terraform Cloud resource handlers
 */

import { TFC_TOKEN } from "../../config.js";
import { handleListOrganizations } from "../tools/organizations.js";
import { handleListWorkspaces, handleShowWorkspace } from "../tools/workspaces.js";
import { handleListWorkspaceResources } from "../tools/workspaceResources.js";
import { ResourceHandler } from "./index.js";
import logger from "../utils/logger.js";
import { handleListError, handleResourceError } from "../utils/responseUtils.js";

// Check if Terraform Cloud token is available
const hasTfcToken = !!TFC_TOKEN;

/**
 * List organizations handler
 */
async function listOrganizations() {
  logger.debug(`TFC_TOKEN availability: ${!!TFC_TOKEN}`);

  if (!hasTfcToken) {
    logger.warn("No TFC_TOKEN provided, cannot list organizations");
    return handleListError(new Error("Terraform Cloud API token not provided"), { endpoint: "organizations" });
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
        return handleListError(parseError, {
          context: "parsing organization response",
          responseAvailable: !!result.content
        });
      }
    }

    logger.debug(`Extracted organizations: ${JSON.stringify(orgs)}`);

    if (!orgs || orgs.length === 0) {
      // Empty results are valid, return success with empty list
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
    return handleListError(error, {
      service: "Terraform Cloud",
      endpoint: "organizations"
    });
  }
}

/**
 * List workspaces handler
 */
async function listWorkspaces(uri: string, params: Record<string, string>) {
  if (!hasTfcToken) {
    logger.warn("No TFC_TOKEN provided, cannot list workspaces");
    return handleListError(new Error("Terraform Cloud API token not provided"), { endpoint: "workspaces", uri });
  }

  const { org } = params;

  try {
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
        return handleListError(parseError, {
          context: "parsing workspaces response",
          organization: org,
          responseAvailable: !!result.content
        });
      }
    }

    logger.debug(`Extracted workspaces: ${JSON.stringify(workspaces)}`);

    if (!workspaces || workspaces.length === 0) {
      // Empty results are valid, return success with empty list
      return {
        type: "success",
        resources: []
      };
    }

    // Map workspaces to resources
    return {
      type: "success",
      resources: workspaces.map((ws: any) => ({
        uri: `terraform://organizations/${org}/workspaces/${ws.id}`,
        title: ws.name,
        description: `Workspace: ${ws.name}`
      }))
    };
  } catch (error) {
    logger.error(`Error listing workspaces for ${org}:`, error);
    // If 404, the organization doesn't exist
    if ((error as any).status === 404 || (error as any).message?.includes("not found")) {
      return handleListError(new Error(`Organization '${org}' not found`), {
        endpoint: "workspaces",
        statusCode: 404,
        uri
      });
    }
    return handleListError(error, {
      endpoint: "workspaces",
      organization: org,
      uri
    });
  }
}

/**
 * Handler for workspace details
 */
async function getWorkspaceDetails(uri: string, params: Record<string, string>) {
  if (!hasTfcToken) {
    logger.warn("No TFC_TOKEN provided, cannot get workspace details");
    return handleResourceError(new Error("Terraform Cloud API token not provided"), {
      endpoint: "workspace details",
      uri
    });
  }

  const { org, workspace } = params;

  try {
    // Use workspace ID if provided, otherwise try to look it up by name
    let workspaceId = workspace;

    // If workspace doesn't look like an ID (ws-*), try to look it up by name
    if (!workspace.startsWith("ws-")) {
      try {
        logger.debug(`Looking up workspace ID for name: ${workspace}`);
        const showResult = await handleShowWorkspace({ organization_name: org, name: workspace });

        if (showResult.content && Array.isArray(showResult.content) && showResult.content.length > 0) {
          const responseData = JSON.parse(showResult.content[0].text);
          if (responseData.metadata?.workspace?.id) {
            workspaceId = responseData.metadata.workspace.id;
            logger.debug(`Found workspace ID: ${workspaceId}`);
          }
        }
      } catch (lookupError) {
        logger.error(`Error looking up workspace ID for ${workspace}:`, lookupError);
        return handleResourceError(lookupError, {
          endpoint: "workspace lookup",
          organization: org,
          workspace,
          uri
        });
      }
    }

    // Get workspace details
    // For real implementation, fetch actual workspace details from the API
    const metadata = {
      id: workspaceId,
      name: workspace,
      organization: org,
      resourceCount: 0 // Placeholder
    };

    return {
      type: "success",
      resource: {
        uri,
        title: workspace,
        description: `Workspace: ${workspace}`,
        properties: metadata
      }
    };
  } catch (error) {
    logger.error(`Error getting workspace details for ${org}/${workspace}:`, error);
    // If 404, the workspace or organization doesn't exist
    if ((error as any).status === 404 || (error as any).message?.includes("not found")) {
      return handleResourceError(new Error(`Workspace '${workspace}' not found in organization '${org}'`), {
        endpoint: "workspace details",
        statusCode: 404,
        uri
      });
    }
    return handleResourceError(error, {
      endpoint: "workspace details",
      organization: org,
      workspace,
      uri
    });
  }
}

/**
 * List workspace resources handler
 */
async function listWorkspaceResources(uri: string, params: Record<string, string>) {
  if (!hasTfcToken) {
    logger.warn("No TFC_TOKEN provided, cannot list workspace resources");
    return handleListError(new Error("Terraform Cloud API token not provided"), {
      endpoint: "workspace resources",
      uri
    });
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
            return handleListError(parseError, {
              context: "parsing workspace lookup response",
              organization: org,
              workspace: workspace,
              responseAvailable: !!workspacesResult.content
            });
          }
        }
      } catch (lookupError) {
        logger.error(`Error looking up workspace ID for ${workspace}:`, lookupError);
        return handleListError(lookupError, {
          endpoint: "workspace resource lookup",
          organization: org,
          workspace: workspace,
          uri
        });
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
        return handleListError(parseError, {
          context: "parsing workspace resources response",
          organization: org,
          workspace: workspaceId,
          responseAvailable: !!result.content
        });
      }
    }

    logger.debug(`Extracted resources: ${JSON.stringify(resources)}`);

    if (!resources || resources.length === 0) {
      // Empty results are valid, return success with empty list
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
    // If 404, the workspace or organization doesn't exist
    if ((error as any).status === 404 || (error as any).message?.includes("not found")) {
      return handleListError(new Error(`Workspace '${workspace}' not found in organization '${org}'`), {
        endpoint: "workspace resources",
        statusCode: 404,
        uri
      });
    }
    return handleListError(error, {
      endpoint: "workspace resources",
      organization: org,
      workspace,
      uri
    });
  }
}

// Resource handlers for Terraform Cloud
export const TerraformCloudResources: ResourceHandler[] = [
  {
    uriPattern: "terraform://organizations",
    handler: listOrganizations
  },
  {
    uriPattern: "terraform://organizations/{org}",
    handler: getWorkspaceDetails
  },
  {
    uriPattern: "terraform://organizations/{org}/workspaces",
    handler: listWorkspaces
  },
  {
    uriPattern: "terraform://organizations/{org}/workspaces/{workspace}",
    handler: getWorkspaceDetails
  },
  {
    uriPattern: "terraform://organizations/{org}/workspaces/{workspace}/resources",
    handler: listWorkspaceResources
  }
];
