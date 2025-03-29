import fetch from "node-fetch";
import { URLSearchParams } from "url";

interface AlgoliaConfig {
  applicationId: string;
  apiKey: string;
  indexName: string;
}

export interface AlgoliaSearchResult {
  hits: Array<{
    "indexed-at": number;
    id: string;
    namespace: string;
    name: string;
    "provider-name"?: string;
    "provider-logo-url"?: string;
    "full-name": string;
    description?: string;
    downloads?: number;
    providers?: Array<{ name: string }>;
    "latest-version": {
      version: string;
      description?: string;
      downloads?: number;
      "published-at": number;
    };
    "latest-version-published-at"?: number;
    verified: boolean;
    objectID: string;
    example?: string; // For policy libraries
  }>;
  nbHits: number;
  page: number;
  nbPages: number;
  hitsPerPage: number;
  query: string;
}

/**
 * Performs a search using Algolia's API
 * @param params Search parameters
 * @param index Algolia index to search (defaults to modules)
 * @returns Search results from Algolia
 */
export async function searchAlgolia(
  config: AlgoliaConfig,
  query: string,
  provider?: string
): Promise<AlgoliaSearchResult> {
  const searchParams = new URLSearchParams({
    query,
    "x-algolia-application-id": config.applicationId,
    "x-algolia-api-key": config.apiKey
  });

  if (provider) {
    searchParams.append("facetFilters", `[["provider-name:${provider}"]]`);
  }

  const response = await fetch(
    `https://${config.applicationId}-dsn.algolia.net/1/indexes/${config.indexName}?${searchParams.toString()}`,
    {
      headers: {
        "Content-Type": "application/json",
        "X-Algolia-Application-Id": config.applicationId,
        "X-Algolia-API-Key": config.apiKey
      }
    }
  );

  if (!response.ok) {
    console.error("Algolia search failed:", await response.text());
    throw new Error(`Algolia search failed: ${response.statusText}`);
  }

  const result = await response.json();
  console.log("Algolia search result:", JSON.stringify(result, null, 2));
  return result as AlgoliaSearchResult;
}

/**
 * Formats module search results into a standardized format
 * @param results Algolia search results
 * @returns Formatted module results
 */
export function formatModuleResults(hits: AlgoliaSearchResult["hits"]) {
  return hits.map((hit) => ({
    id: hit.id,
    namespace: hit.namespace,
    name: hit.name,
    provider: hit["provider-name"],
    description: hit.description,
    downloads: hit.downloads,
    version: hit["latest-version"].version,
    source: hit["provider-logo-url"],
    published_at: hit["latest-version"]["published-at"],
    owner: hit["provider-name"],
    tier: "",
    verified: hit.verified,
    full_name: hit["full-name"],
    registry_name: "",
    ranking: {},
    highlights: {}
  }));
}
