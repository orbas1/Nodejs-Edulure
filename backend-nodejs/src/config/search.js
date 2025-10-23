import { env } from './env.js';

export function createSearchConfiguration(configuration = env.search) {
  return {
    schema: configuration.schema,
    dictionary: configuration.dictionary,
    maxPerPage: configuration.maxPerPage,
    facetMaxBuckets: configuration.facetMaxBuckets,
    ingestion: { ...configuration.ingestion }
  };
}

export const searchConfiguration = createSearchConfiguration();

export default searchConfiguration;
