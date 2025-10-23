import { env } from './env.js';

export function createSearchConfiguration(configuration = env.search) {
  return {
    tableName: configuration.tableName ?? 'search_documents',
    heartbeatIntervalMs: configuration.healthcheckIntervalMs ?? 30000,
    indexPrefix: configuration.indexPrefix ?? 'edulure'
  };
}

export const searchConfiguration = createSearchConfiguration();

export default searchConfiguration;
