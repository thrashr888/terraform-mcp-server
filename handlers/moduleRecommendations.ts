import { ModuleRecommendationsInput, ResponseContent } from '../types/index.js';
import { createStandardResponse, formatAsMarkdown, formatUrl, addStandardContext } from '../utils/responseUtils.js';
import { fetchData, getModuleDocUrl } from '../utils/apiUtils.js';
import { handleToolError } from '../utils/responseUtils.js';
import { REGISTRY_API_V1 } from '../config.js';
import logger from '../utils/logger.js';

interface ModuleSearchResult {
  modules: Array<{
    id: string;
    namespace: string;
    name: string;
    provider: string;
    version: string;
    description: string;
    source: string;
    tag_count: number;
    published_at: string;
  }>;
  meta: {
    limit: number;
    current_offset: number;
    next_offset: number;
  };
}

/**
 * Handles the moduleRecommendations tool request
 * @param params Input parameters for module recommendations
 * @returns Standardized response with module recommendations
 */
export async function handleModuleRecommendations(params: ModuleRecommendationsInput): Promise<ResponseContent> {
  try {
    logger.debug('Processing moduleRecommendations request', params);
    
    // Extract and validate search parameters
    const searchStr = params.query || params.keyword || '';
    if (!searchStr) {
      throw new Error('Search query is required for module recommendations.');
    }
    
    const providerFilter = params.provider || '';
    
    // Build search URL with parameters
    let searchUrl = `${REGISTRY_API_V1}/modules/search?q=${encodeURIComponent(searchStr)}&limit=3&verified=true`;
    if (providerFilter) {
      searchUrl += `&provider=${encodeURIComponent(providerFilter)}`;
    }
    
    // Fetch module search results
    const resultData = await fetchData<ModuleSearchResult>(searchUrl);
    const modules = resultData.modules || [];
    
    if (modules.length === 0) {
      const text = `No modules found for "${searchStr}".`;
      logger.info(`No modules found for "${searchStr}"`);
      return createStandardResponse("error", text, { 
        query: searchStr, 
        provider: providerFilter 
      });
    }
    
    // Construct a better formatted response with structured module information
    let markdownResponse = `## Recommended modules for "${searchStr}"\n\n`;
    
    // Process each module and create a structured format
    const formattedModules = modules.map((mod, index) => {
      const name = `${mod.namespace}/${mod.name}`;
      const prov = mod.provider;
      const description = mod.description || '';
      const usageExample = `module "${mod.name}" {
  source = "${name}/${prov}"
  version = "${mod.version || "latest"}"
  
  # Required inputs go here
}`;

      // Add to markdown response
      markdownResponse += `### ${index + 1}. ${name}/${prov}\n\n`;
      markdownResponse += `**Description**: ${description}\n\n`;
      markdownResponse += `**Provider**: ${prov}\n\n`;
      markdownResponse += `**Example Usage**:\n\n`;
      markdownResponse += formatAsMarkdown(usageExample);
      markdownResponse += `\n\n`;
      
      // Also return structured data for each module
      return {
        name: name,
        provider: prov,
        description: description,
        url: formatUrl(getModuleDocUrl(mod.namespace, mod.name, prov)),
        latestVersion: mod.version || 'latest',
      };
    });
    
    logger.info(`Found ${modules.length} modules for "${searchStr}"`);
    
    // Add contextual information about the search
    const metadata = {
      query: searchStr,
      provider: providerFilter,
      resultCount: modules.length,
      modules: formattedModules
    };
    
    // Add standard context information
    addStandardContext(metadata);
    
    return createStandardResponse('success', markdownResponse, metadata);
  } catch (error) {
    return handleToolError('moduleRecommendations', error, {
      inputParams: params
    });
  }
}