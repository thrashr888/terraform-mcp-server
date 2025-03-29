import {
  ResponseContent,
  PrivateModuleDetailsParams,
  PrivateModule,
  ModuleVersion,
  NoCodeModule
} from "../types/index.js";
import { getPrivateModuleDetails } from "../utils/hcpApiUtils.js";
import { TFC_TOKEN } from "../config.js";
import { createStandardResponse } from "../utils/responseUtils.js";
import logger from "../utils/logger.js";

export async function handlePrivateModuleDetails(params: PrivateModuleDetailsParams): Promise<ResponseContent> {
  if (!TFC_TOKEN) {
    throw new Error("TFC_TOKEN environment variable is required for private module details");
  }

  try {
    logger.debug("Getting private module details", { params });

    const result = await getPrivateModuleDetails(
      TFC_TOKEN,
      params.organization,
      params.namespace,
      params.name,
      params.provider,
      params.version
    );

    const moduleDetails = result.moduleDetails as unknown as PrivateModule;
    const moduleVersion = result.moduleVersion as unknown as ModuleVersion | undefined;
    const noCodeModules = result.noCodeModules as unknown as NoCodeModule[] | undefined;

    // Format the module details into markdown
    let markdown = `## Private Module: ${moduleDetails.attributes.name}

**Provider:** ${moduleDetails.attributes.provider}
**Status:** ${moduleDetails.attributes.status}
**Updated:** ${new Date(moduleDetails.attributes["updated-at"]).toLocaleDateString()}`;

    if (moduleVersion?.attributes?.version) {
      markdown += `\n\n### Version ${moduleVersion.attributes.version}`;
      const inputs = moduleVersion.root?.inputs;
      const outputs = moduleVersion.root?.outputs;

      if (inputs?.length) {
        markdown += "\n\n**Inputs:**\n";
        inputs.forEach((input) => {
          markdown += `- \`${input.name}\` (${input.type})${input.required ? " (required)" : ""}: ${input.description}\n`;
        });
      }

      if (outputs?.length) {
        markdown += "\n**Outputs:**\n";
        outputs.forEach((output) => {
          markdown += `- \`${output.name}\`: ${output.description}\n`;
        });
      }
    }

    if (Array.isArray(noCodeModules) && noCodeModules.length > 0) {
      markdown += "\n\n### No-Code Configuration\n";
      noCodeModules.forEach((ncm) => {
        markdown += `\n**${ncm.attributes.name}**\n`;
        if (ncm.attributes["variable-options"]?.length > 0) {
          markdown += "Variables:\n";
          ncm.attributes["variable-options"].forEach((vo) => {
            markdown += `- \`${vo.name}\`: ${vo.type}\n`;
          });
        }
      });
    }

    markdown += `\n\n\`\`\`hcl
module "${params.name}" {
  source = "app.terraform.io/${params.organization}/registry-modules/private/${params.namespace}/${params.name}/${params.provider}"
  version = "${params.version || moduleDetails.attributes["version-statuses"]?.[0]?.version || "latest"}"

  # Configure variables as needed
}\`\`\``;

    return createStandardResponse("success", markdown, {
      module: {
        id: moduleDetails.id,
        name: moduleDetails.attributes.name,
        provider: moduleDetails.attributes.provider,
        status: moduleDetails.attributes.status,
        versions: moduleDetails.attributes["version-statuses"],
        created_at: moduleDetails.attributes["created-at"],
        updated_at: moduleDetails.attributes["updated-at"]
      },
      version: moduleVersion,
      no_code_modules: noCodeModules,
      context: {
        timestamp: new Date().toISOString(),
        organization: params.organization,
        provider: params.provider
      }
    });
  } catch (error) {
    logger.error("Error getting private module details:", error);
    throw error;
  }
}
