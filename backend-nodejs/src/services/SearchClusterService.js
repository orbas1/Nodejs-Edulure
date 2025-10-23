import db from '../config/database.js';
import logger from '../config/logger.js';
import { recordSearchOperation, updateSearchIndexStatus, updateSearchNodeHealth } from '../observability/metrics.js';
import RelationalExplorerSearchProvider from './search/RelationalExplorerSearchProvider.js';
import { SUPPORTED_ENTITIES } from './search/entityConfig.js';

export class SearchClusterService {
  constructor({ dbClient = db, loggerInstance = logger } = {}) {
    this.db = dbClient;
    this.logger = loggerInstance;
    this.started = false;
    this.provider = new RelationalExplorerSearchProvider({ dbClient: this.db, loggerInstance: this.logger });
  }

  async ensureTable() {
    const exists = await this.db.schema.hasTable('search_documents');
    if (!exists) {
      throw new Error('Search documents table not found. Run database migrations to initialise Edulure Search.');
    }
  }

  async start() {
    if (this.started) {
      return;
    }
    await this.ensureTable();
    await recordSearchOperation('search_cluster_start', async () => {
      this.started = true;
      updateSearchNodeHealth({ host: 'database', role: 'primary', healthy: true });
      SUPPORTED_ENTITIES.forEach((entity) => updateSearchIndexStatus(entity, true));
      this.logger.info('Edulure Search provider initialised using relational backend');
    });
  }

  async stop() {
    if (!this.started) {
      return;
    }
    this.started = false;
    updateSearchNodeHealth({ host: 'database', role: 'primary', healthy: false });
    this.logger.info('Edulure Search provider stopped');
  }

  async bootstrap() {
    await this.start();
  }

  async checkClusterHealth() {
    try {
      const [{ total }] = await this.db('search_documents').count({ total: '*' });
      updateSearchNodeHealth({ host: 'database', role: 'primary', healthy: true });
      return {
        status: 'healthy',
        documents: Number(total ?? 0)
      };
    } catch (error) {
      updateSearchNodeHealth({ host: 'database', role: 'primary', healthy: false });
      this.logger.error({ err: error }, 'Failed to query search documents table');
      throw error;
    }
  }

  get searchClient() {
    if (!this.started) {
      return null;
    }
    return this.provider;
  }

  getClusterStatus() {
    const status = this.started ? 'healthy' : 'stopped';
    return {
      nodes: [
        {
          host: 'database',
          role: 'primary',
          status,
          latencyMs: null
        }
      ],
      summary: {
        healthy: this.started ? 1 : 0,
        degraded: 0,
        unreachable: this.started ? 0 : 1
      },
      generatedAt: new Date().toISOString()
    };
  }

  async createSnapshot() {
    await this.ensureTable();
    const [{ total }] = await this.db('search_documents').count({ total: '*' });
    return {
      status: 'noop',
      documents: Number(total ?? 0),
      generatedAt: new Date().toISOString()
    };
  }
}

export const searchClusterService = new SearchClusterService();

export default searchClusterService;
