/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="webworker" />

import logger from "./logger.js";
import { REQUEST_TIMEOUT_MS, TF_CLOUD_API_BASE } from "../../config.js";
import { AbortController } from "abort-controller";
import { URLSearchParams } from "url";
import fetch, { RequestInit } from "node-fetch";

interface TFCloudResponse<T> {
  data: T;
  included?: unknown[];
  links?: {
    self?: string;
    first?: string;
    prev?: string;
    next?: string;
    last?: string;
  };
  meta?: {
    pagination?: {
      current_page: number;
      prev_page: number | null;
      next_page: number | null;
      total_pages: number;
      total_count: number;
    };
  };
}

interface PrivateModule {
  id: string;
  type: string;
  attributes: {
    name: string;
    provider: string;
    "registry-name": string;
    status: string;
    "version-statuses": string[];
    "created-at": string;
    "updated-at": string;
    permissions: {
      "can-delete": boolean;
      "can-resync": boolean;
      "can-retry": boolean;
    };
  };
  relationships: {
    organization: {
      data: {
        id: string;
        type: string;
      };
    };
  };
}

export async function fetchWithAuth<T>(
  url: string,
  token: string,
  options: RequestInit = {}
): Promise<TFCloudResponse<T>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    logger.debug(`Fetching data from: ${url}`);

    const fetchOptions: RequestInit = {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/vnd.api+json"
      },
      signal: controller.signal
    };

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as TFCloudResponse<T>;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      logger.error(`Request to ${url} timed out after ${REQUEST_TIMEOUT_MS}ms`);
      throw new Error(`Request timed out after ${REQUEST_TIMEOUT_MS}ms`);
    }

    logger.error(`Error fetching data from ${url}:`, error);
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function searchPrivateModules(
  token: string,
  orgName: string,
  query?: string,
  provider?: string,
  page: number = 1,
  pageSize: number = 20
): Promise<{
  modules: PrivateModule[];
  pagination?: {
    current_page: number;
    prev_page: number | null;
    next_page: number | null;
    total_pages: number;
    total_count: number;
  };
}> {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (provider) params.set("filter[provider]", provider);
  params.set("page[number]", page.toString());
  params.set("page[size]", pageSize.toString());

  const url = `${TF_CLOUD_API_BASE}/organizations/${orgName}/registry-modules${params.toString() ? `?${params.toString()}` : ""}`;
  const response = await fetchWithAuth<PrivateModule[]>(url, token);

  return {
    modules: Array.isArray(response.data) ? response.data : [response.data],
    pagination: response.meta?.pagination
  };
}

export async function getPrivateModuleDetails(
  token: string,
  orgName: string,
  namespace: string,
  name: string,
  provider: string,
  version?: string
): Promise<{
  moduleDetails: PrivateModule;
  moduleVersion?: any;
  noCodeModules?: any[];
}> {
  // Get module details from v2 API
  const v2Url = `${TF_CLOUD_API_BASE}/organizations/${orgName}/registry-modules/private/${namespace}/${name}/${provider}?include=no-code-modules,no-code-modules.variable-options`;
  const v2Response = await fetchWithAuth<PrivateModule>(v2Url, token);

  let moduleVersion;
  if (version) {
    // Get version details from v1 API
    const v1Url = `${TF_CLOUD_API_BASE}/registry/v1/modules/${namespace}/${name}/${provider}/${version}`;
    try {
      const v1Response = await fetchWithAuth<any>(v1Url, token);
      moduleVersion = v1Response.data;
    } catch (error) {
      logger.warn(`Failed to fetch version details: ${error}`);
    }
  }

  return {
    moduleDetails: v2Response.data,
    moduleVersion,
    noCodeModules: v2Response.included
  };
}
