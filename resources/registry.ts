/**
 * Terraform Registry resource handlers
 */

import { DEFAULT_NAMESPACE } from "../config.js";
import { handleProviderLookup } from "../handlers/providerLookup.js";
import { handleDataSourceLookup } from "../handlers/dataSourceLookup.js";
import { handleResourceArgumentDetails } from "../handlers/resourceArgumentDetails.js";
import { handleModuleRecommendations } from "../handlers/moduleRecommendations.js";
import { handleModuleDetails } from "../handlers/moduleDetails.js";
import { ResourceHandler } from "./index.js";
import logger from "../utils/logger.js";

/**
 * Root handler to list available resource types
 */
async function listResourceTypes() {
  return {
    type: "success",
    resources: [
      {
        uri: "registry://providers",
        title: "Terraform Providers",
        description: "List of available Terraform providers"
      },
      {
        uri: "registry://modules",
        title: "Terraform Modules",
        description: "Search Terraform Registry modules"
      }
    ]
  };
}

/**
 * List providers handler
 */
async function listProviders() {
  // For now, return a simple list of common providers
  // In a full implementation, this would query the Terraform Registry API
  const commonProviders = [
    "aws",
    "google",
    "azurerm",
    "kubernetes",
    "github",
    "docker",
    "null",
    "random",
    "time",
    "local",
    "tls",
    "vault"
  ];

  return {
    type: "success",
    resources: commonProviders.map((provider) => ({
      uri: `registry://providers/hashicorp/${provider}`,
      title: provider,
      description: `Terraform provider for ${provider}`
    }))
  };
}

/**
 * Get provider details handler
 */
async function getProviderDetails(uri: string, params: Record<string, string>) {
  const { namespace, provider, version } = params;

  try {
    const result = await handleProviderLookup({
      namespace: namespace || DEFAULT_NAMESPACE,
      provider,
      version
    });

    return {
      type: "success",
      resource: {
        uri,
        title: `${provider} Provider`,
        description: result.description || `Terraform provider for ${provider}`,
        content: result.markdown || "",
        properties: {
          namespace,
          provider,
          version: result.version
        }
      }
    };
  } catch (error) {
    logger.error(`Error getting provider details for ${namespace}/${provider}:`, error);

    // Return basic provider info even if lookup fails
    return {
      type: "success",
      resource: {
        uri,
        title: `${provider} Provider`,
        description: `Terraform provider for ${provider}`,
        content: `## ${provider} Provider\n\nProvider details could not be retrieved.`,
        properties: {
          namespace,
          provider
        }
      }
    };
  }
}

/**
 * List data sources handler
 */
async function listDataSources(uri: string, params: Record<string, string>) {
  const { namespace, provider } = params;

  try {
    const result = await handleDataSourceLookup({
      namespace: namespace || DEFAULT_NAMESPACE,
      provider
    });

    // Check if dataSources exists in the result
    if (!result.dataSources) {
      return {
        type: "success",
        resources: []
      };
    }

    return {
      type: "success",
      resources: result.dataSources.map((dataSource: any) => ({
        uri: `registry://providers/${namespace}/${provider}/data-sources/${dataSource.name}`,
        title: dataSource.name,
        description: dataSource.description || `Data source for ${dataSource.name}`
      }))
    };
  } catch (error) {
    logger.error(`Error listing data sources for ${provider}:`, error);
    return {
      type: "success",
      resources: [] // Return empty list instead of error to be more resilient
    };
  }
}

/**
 * Get resource details handler
 */
async function getResourceDetails(uri: string, params: Record<string, string>) {
  const { namespace, provider, resource } = params;

  try {
    const result = await handleResourceArgumentDetails({
      namespace: namespace || DEFAULT_NAMESPACE,
      provider,
      resource
    });

    return {
      type: "success",
      resource: {
        uri,
        title: resource,
        description: `Resource: ${resource}`,
        content: result.markdown || "",
        properties: {
          namespace,
          provider,
          resource,
          arguments: result.arguments
        }
      }
    };
  } catch (error) {
    logger.error(`Error getting resource details for ${namespace}/${provider}/${resource}:`, error);

    // Return basic resource info even if lookup fails
    return {
      type: "success",
      resource: {
        uri,
        title: resource,
        description: `Resource: ${resource}`,
        content: `## ${resource}\n\nResource details could not be retrieved.`,
        properties: {
          namespace,
          provider,
          resource
        }
      }
    };
  }
}

/**
 * List modules handler
 */
async function listModules(uri: string, params: Record<string, string>) {
  const { query = "vpc" } = params; // Default to searching for VPC modules

  try {
    const result = await handleModuleRecommendations({
      query
    });

    // Check if modules exists in the result
    if (!result.modules || !Array.isArray(result.modules)) {
      logger.debug("No modules found in result or modules is not an array");
      return {
        type: "success",
        resources: []
      };
    }

    return {
      type: "success",
      resources: result.modules.map((module: any) => ({
        uri: `registry://modules/${module.namespace}/${module.name}/${module.provider}`,
        title: module.name,
        description: module.description || `Terraform module: ${module.namespace}/${module.name}/${module.provider}`
      }))
    };
  } catch (error) {
    logger.error(`Error listing modules for query "${query}":`, error);
    return {
      type: "success",
      resources: [] // Return empty list instead of error to be more resilient
    };
  }
}

/**
 * Get module details handler
 */
async function getModuleDetails(uri: string, params: Record<string, string>) {
  const { namespace, name, provider } = params;

  try {
    const result = await handleModuleDetails({
      namespace,
      module: name,
      provider
    });

    return {
      type: "success",
      resource: {
        uri,
        title: `${namespace}/${name}/${provider}`,
        description: result.description || `Terraform module: ${namespace}/${name}/${provider}`,
        content: result.markdown || `## ${namespace}/${name}/${provider}\n\n${result.description || ""}`,
        properties: {
          namespace,
          name,
          provider,
          inputs: result.inputs,
          outputs: result.outputs
        }
      }
    };
  } catch (error) {
    logger.error(`Error getting module details for ${namespace}/${name}/${provider}:`, error);

    // Return basic module info even if lookup fails
    return {
      type: "success",
      resource: {
        uri,
        title: `${namespace}/${name}/${provider}`,
        description: `Terraform module: ${namespace}/${name}/${provider}`,
        content: `## ${namespace}/${name}/${provider}\n\nModule details could not be retrieved.`,
        properties: {
          namespace,
          name,
          provider
        }
      }
    };
  }
}

// Define all Registry resource handlers
export const RegistryResources: ResourceHandler[] = [
  {
    uriPattern: "registry://",
    handler: listResourceTypes
  },
  {
    uriPattern: "registry://providers",
    handler: listProviders
  },
  {
    uriPattern: "registry://providers/{namespace}/{provider}",
    handler: getProviderDetails
  },
  {
    uriPattern: "registry://providers/{namespace}/{provider}/versions/{version}",
    handler: getProviderDetails
  },
  {
    uriPattern: "registry://providers/{namespace}/{provider}/data-sources",
    handler: listDataSources
  },
  {
    uriPattern: "registry://providers/{namespace}/{provider}/resources/{resource}",
    handler: getResourceDetails
  },
  {
    uriPattern: "registry://modules",
    handler: listModules
  },
  {
    uriPattern: "registry://modules/{namespace}/{name}/{provider}",
    handler: getModuleDetails
  }
];
