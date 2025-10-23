import logger from '../config/logger.js';
import { env } from '../config/env.js';
import { searchClusterService } from './SearchClusterService.js';
import { recordSearchIngestionRun } from '../observability/metrics.js';

export class SearchIngestionService {
  constructor({
    clusterService = searchClusterService,
    loggerInstance = logger,
    ingestionConfig = env.search.ingestion
  } = {}) {
    this.clusterService = clusterService;
    this.logger = loggerInstance.child({ module: 'search-ingestion' });
    this.ingestionConfig = ingestionConfig;
  }

  get supportedIndexes() {
    return this.clusterService.supportedEntities;
  }

  async fullReindex({ indexes = this.supportedIndexes, reason = 'manual', since = null } = {}) {
    const unique = Array.from(new Set(indexes));
    const startTime = Date.now();
    const effectiveConcurrency = Math.max(
      1,
      Math.min(this.ingestionConfig?.concurrency ?? 1, unique.length || 1)
    );
    const shouldDeleteBeforeReindex = !since && this.ingestionConfig?.deleteBeforeReindex !== false;

    for (let i = 0; i < unique.length; i += effectiveConcurrency) {
      const batch = unique.slice(i, i + effectiveConcurrency);
      await Promise.all(
        batch.map((entity) =>
          this.reindexIndex(entity, { reason, since, deleteBeforeReindex: shouldDeleteBeforeReindex })
        )
      );
    }

    const durationSeconds = (Date.now() - startTime) / 1000;
    this.logger.info({ indexes: unique, durationSeconds }, 'Completed full Postgres search refresh');
  }

  async reindexIndex(entity, { reason = 'manual', since = null, deleteBeforeReindex = true } = {}) {
    const startedAt = Date.now();
    try {
      if (deleteBeforeReindex && !since && typeof this.clusterService.clearEntityDocuments === 'function') {
        await this.clusterService.clearEntityDocuments(entity);
      }

      const documentCount = await this.clusterService.refreshEntity(entity, { since });
      recordSearchIngestionRun({
        index: entity,
        documentCount: documentCount ?? null,
        durationSeconds: (Date.now() - startedAt) / 1000,
        status: 'success',
        metadata: { reason, since: since ? since.toISOString?.() ?? since : null }
      });
      this.logger.info({ entity, reason, since }, 'Search documents refreshed');
    } catch (error) {
      recordSearchIngestionRun({
        index: entity,
        documentCount: 0,
        durationSeconds: (Date.now() - startedAt) / 1000,
        status: 'error',
        error,
        metadata: { reason, since: since ? since.toISOString?.() ?? since : null }
      });
      this.logger.error({ err: error, entity }, 'Search ingestion failed');
      throw error;
    }
  }
}

export const searchIngestionService = new SearchIngestionService();

export default searchIngestionService;
