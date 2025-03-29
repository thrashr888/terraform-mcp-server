import { ModuleDetailsInput, ResponseContent } from "../types/index.js";
import { createStandardResponse, formatAsMarkdown, formatUrl, addStandardContext } from "../utils/responseUtils.js";
import { fetchData, getModuleDocUrl } from "../utils/apiUtils.js";
import { handleToolError } from "../utils/responseUtils.js";
import { getExampleValue } from "../utils/contentUtils.js";
import { REGISTRY_API_V1 } from "../../config.js";
import logger from "../utils/logger.js";

interface ModuleDetail {
  id: string;
  root: {
    inputs: Array<{
      name: string;
      type: string;
      description: string;
      default: any;
      required: boolean;
    }>;
    outputs: Array<{
      name: string;
      description: string;
    }>;
    dependencies: Array<{
      name: string;
      source: string;
      version: string;
    }>;
  };
  versions: string[];
  description: string;
}

/**
 * Handles the moduleDetails tool request
 * @param params Input parameters for module details
 * @returns Standardized response with module details
 */
export async function handleModuleDetails(params: ModuleDetailsInput): Promise<ResponseContent> {
  try {
    logger.debug("Processing moduleDetails request", params);

    // Extract required parameters
    const { namespace, module, provider } = params;
    if (!namespace || !module || !provider) {
      throw new Error("Namespace, module, and provider are required.");
    }

    // Fetch module details from the registry
    const url = `${REGISTRY_API_V1}/modules/${namespace}/${module}/${provider}`;
    const moduleData = await fetchData<ModuleDetail>(url);

    const versions = moduleData.versions || [];
    const root = moduleData.root || {};
    const inputs = root.inputs || [];
    const outputs = root.outputs || [];
    const dependencies = root.dependencies || [];

    // Create a summary markdown response that's more readable
    let markdownResponse = `## Module: ${namespace}/${module}/${provider}\n\n`;

    // Include latest version and published date
    markdownResponse += `**Latest Version**: ${versions[0] || "unknown"}\n\n`;

    // Add module description if available
    if (moduleData.description) {
      markdownResponse += `**Description**: ${moduleData.description}\n\n`;
    }

    // Add usage example
    const usageExample = `module "${module}" {
  source = "${namespace}/${module}/${provider}"
  version = "${versions[0] || "latest"}"
  
  # Required inputs
${inputs
  .filter((input) => input.required)
  .map((input) => `  ${input.name} = ${getExampleValue(input)}`)
  .join("\n")}
}`;

    markdownResponse += `**Example Usage**:\n\n${formatAsMarkdown(usageExample)}\n\n`;

    // Add a summary of required inputs
    if (inputs.length > 0) {
      markdownResponse += "### Required Inputs\n\n";
      const requiredInputs = inputs.filter((input) => input.required);

      if (requiredInputs.length > 0) {
        requiredInputs.forEach((input) => {
          markdownResponse += `- **${input.name}** (${input.type}): ${input.description || "No description available"}\n`;
        });
      } else {
        markdownResponse += "*No required inputs*\n";
      }
      markdownResponse += "\n";
    }

    // Add a summary of key outputs
    if (outputs.length > 0) {
      markdownResponse += "### Key Outputs\n\n";
      // Limit to 5 most important outputs to avoid overwhelming information
      const keyOutputs = outputs.slice(0, 5);
      keyOutputs.forEach((output) => {
        markdownResponse += `- **${output.name}**: ${output.description || "No description available"}\n`;
      });
      if (outputs.length > 5) {
        markdownResponse += `\n*... and ${outputs.length - 5} more outputs*\n`;
      }
      markdownResponse += "\n";
    }

    // Include documentation URL
    const docsUrl = formatUrl(getModuleDocUrl(namespace, module, provider));
    markdownResponse += `**[View Full Documentation](${docsUrl})**\n`;

    logger.info(`Retrieved details for ${namespace}/${module}/${provider}`);

    // Create metadata with structured information
    const metadata = {
      moduleId: `${namespace}/${module}/${provider}`,
      latestVersion: versions[0] || "unknown",
      allVersions: versions.slice(0, 5), // Show only the most recent 5 versions
      totalVersions: versions.length,
      inputCount: inputs.length,
      outputCount: outputs.length,
      dependencies,
      documentationUrl: docsUrl
    };

    // Add compatibility information
    addStandardContext(metadata);

    return createStandardResponse("success", markdownResponse, metadata);
  } catch (error) {
    return handleToolError("moduleDetails", error, {
      inputParams: params
    });
  }
}
