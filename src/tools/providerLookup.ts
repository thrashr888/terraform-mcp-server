import { DEFAULT_NAMESPACE } from "../../config.js";
import logger from "../utils/logger.js";
import { ProviderLookupInput, ResponseContent } from "../types/index.js";
import { handleToolError } from "../utils/responseUtils.js";

interface ProviderVersionsResponse {
  included: ProviderVersionData[];
}

interface ProviderVersionAttributes {
  description: string;
  downloads: number;
  "published-at": string;
  tag: string;
  version: string;
}

interface ProviderVersionData {
  type: string;
  id: string;
  attributes: ProviderVersionAttributes;
  links: {
    self: string;
  };
}

interface ProviderAttributes {
  alias: string;
  description: string;
  downloads: number;
  source: string;
  tier: string;
  "full-name": string;
  "owner-name": string;
}

interface ProviderResponse {
  data: {
    type: string;
    id: string;
    attributes: ProviderAttributes;
    links: {
      self: string;
    };
  };
}

export async function handleProviderLookup(params: ProviderLookupInput): Promise<ResponseContent> {
  try {
    logger.debug("Processing providerLookup request", params);

    // Extract and normalize parameters
    let providerStr = params.provider || "";
    let namespaceStr = params.namespace || DEFAULT_NAMESPACE;
    const requestedVersion = params.version;

    // Handle provider format with namespace/provider
    if (providerStr.includes("/")) {
      const [ns, prov] = providerStr.split("/");
      namespaceStr = ns;
      providerStr = prov || "";
    }

    // Validate required parameters
    if (!providerStr) {
      throw new Error("Provider name is required");
    }

    // Fetch provider info from v2 API
    const providerUrl = `https://registry.terraform.io/v2/providers/${namespaceStr}/${providerStr}`;
    const providerResponse = await fetch(providerUrl);
    const providerData: ProviderResponse = await providerResponse.json();

    // Fetch version info from v2 API with included versions
    const versionsUrl = `https://registry.terraform.io/v2/providers/${namespaceStr}/${providerStr}?include=provider-versions`;
    const versionsResponse = await fetch(versionsUrl);
    const versionsData: ProviderVersionsResponse = await versionsResponse.json();

    // Sort versions by published date
    const sortedVersions = versionsData.included.sort(
      (a: ProviderVersionData, b: ProviderVersionData) =>
        new Date(b.attributes["published-at"]).getTime() - new Date(a.attributes["published-at"]).getTime()
    );

    const latestVersion = sortedVersions[0]?.attributes.version || "Not available";
    const recentVersions = sortedVersions.slice(0, 5).map((v: ProviderVersionData) => ({
      version: v.attributes.version,
      protocols: ["5.0"], // Hardcoded as this info isn't readily available in v2 API
      date: v.attributes["published-at"]
    }));

    // Format markdown response
    const markdown = `## ${providerData.data.attributes["full-name"]} Provider

**Latest Version**: ${latestVersion}${requestedVersion ? ` (Requested: ${requestedVersion})` : ""}
**Total Versions**: ${sortedVersions.length}

**Recent Versions**:
${recentVersions.map((v: { version: string; date: string }) => `- ${v.version} (${v.date})`).join("\n")}

**Provider Details**:
- Tier: ${providerData.data.attributes.tier}
- Downloads: ${providerData.data.attributes.downloads.toLocaleString()}
- Source: ${providerData.data.attributes.source}
- Protocols: 5.0

**Description**:
${providerData.data.attributes.description}

**Platform Support**:
- linux/amd64
- darwin/amd64
- windows/amd64
- linux/arm64
- darwin/arm64

**Usage Example**:
\`\`\`hcl
terraform {
  required_providers {
    ${providerStr} = {
      source = "${namespaceStr}/${providerStr}"
      version = ">= ${latestVersion}"
    }
  }
}

provider "${providerStr}" {
  # Configuration options
}
\`\`\`

[Full Documentation](https://registry.terraform.io/providers/${namespaceStr}/${providerStr}/latest/docs)`;

    return {
      status: "success",
      content: [
        {
          type: "text",
          text: markdown
        }
      ],
      metadata: {
        namespace: namespaceStr,
        provider: providerStr,
        version: {
          latest: latestVersion,
          total: sortedVersions.length,
          recent: recentVersions
        },
        info: {
          tier: providerData.data.attributes.tier,
          downloads: providerData.data.attributes.downloads,
          source: providerData.data.attributes.source,
          description: providerData.data.attributes.description,
          platforms: ["linux/amd64", "darwin/amd64", "windows/amd64", "linux/arm64", "darwin/arm64"]
        },
        documentationUrl: `https://registry.terraform.io/providers/${namespaceStr}/${providerStr}/latest/docs`,
        context: {
          terraformCoreVersions: ["1.0+"],
          lastUpdated: new Date().toISOString()
        }
      }
    };
  } catch (error) {
    return handleToolError("providerLookup", error, {
      inputParams: params,
      context: {
        message: error instanceof Error ? error.message : "Unknown error occurred",
        timestamp: new Date().toISOString()
      }
    });
  }
}
