import logger from '../config/logger.js';
import ExplorerSearchDocumentModel from '../models/ExplorerSearchDocumentModel.js';
import { SearchIngestionService } from './SearchIngestionService.js';

export class SearchClusterService {
  constructor({ documentModel = ExplorerSearchDocumentModel, ingestionService, loggerInstance = logger } = {}) {
    this.documentModel = documentModel;
    this.ingestionService =
      ingestionService ?? new SearchIngestionService({ documentModel, loggerInstance: loggerInstance?.child?.({ service: 'SearchIngestionService' }) });
    this.logger = loggerInstance?.child ? loggerInstance.child({ service: 'SearchDocumentRegistry' }) : logger;
    this.started = false;
  }

  getSupportedEntities() {
    return this.ingestionService.getSupportedEntities();
  }

  async start() {
    if (this.started) {
      return { status: 'ready', message: 'Search document registry already initialised' };
    }
    await this.bootstrap();
    this.started = true;
    return { status: 'ready', message: 'Search document registry initialised' };
  }

  stop() {
    this.started = false;
  }

  async bootstrap() {
    await this.ingestionService.fullReindex();
    this.logger.info('Explorer search documents refreshed');
    return { status: 'ready', message: 'Explorer search documents refreshed' };
  }

  async checkClusterHealth() {
    const counts = await this.documentModel.countByEntity();
    this.logger.info({ counts }, 'Explorer search document registry status');
    return counts;
  }

  async createSnapshot() {
    const snapshot = await this.documentModel.exportSnapshot();
    const taskUid = `search-documents-${Date.now().toString(36)}`;
    this.logger.info({ taskUid, documentCount: snapshot.length }, 'Explorer search document snapshot created');
    return { taskUid, status: 'succeeded', documents: snapshot };
  }
}

export const searchClusterService = new SearchClusterService();

export default searchClusterService;
