import { env } from './env.js';

export function createSearchConfiguration(configuration = env.search) {
  const ingestion = configuration?.ingestion ?? {};
  return {
    provider: 'database',
    ingestion: {
      batchSize: Number.isFinite(Number(ingestion.batchSize)) ? Number(ingestion.batchSize) : 200,
      concurrency: Number.isFinite(Number(ingestion.concurrency)) ? Number(ingestion.concurrency) : 1
    },
    metadata: {
      indexPrefix: configuration?.indexPrefix ?? 'explorer',
      healthcheckIntervalMs: configuration?.healthcheckIntervalMs ?? 30_000,
      allowedIps: configuration?.allowedIps ?? []
    }
  };
}

export const searchConfiguration = createSearchConfiguration();

export default searchConfiguration;
