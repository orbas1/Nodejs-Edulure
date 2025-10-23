import db from '../config/database.js';
import logger from '../config/logger.js';
import SearchDocumentModel, { searchDocumentModel } from '../models/SearchDocumentModel.js';

function resolveModel(baseModel, connection) {
  if (connection && typeof baseModel.withConnection === 'function') {
    return baseModel.withConnection(connection);
  }
  if (connection) {
    return new SearchDocumentModel({ dbClient: connection });
  }
  return baseModel;
}

export class SearchDocumentsRepository {
  constructor({
    dbClient = db,
    loggerInstance = logger.child({ module: 'search-documents-repo' }),
    model = searchDocumentModel.withConnection ? searchDocumentModel.withConnection(dbClient) : searchDocumentModel
  } = {}) {
    this.db = dbClient;
    this.logger = loggerInstance;
    this.model = model;
  }

  withConnection(connection) {
    if (!connection) {
      return this;
    }
    return new SearchDocumentsRepository({
      dbClient: connection,
      loggerInstance: this.logger,
      model: resolveModel(this.model, connection)
    });
  }

  async deleteByEntity(entityType, connection) {
    const model = resolveModel(this.model, connection);
    return model.deleteByEntity(entityType);
  }

  async upsertDocuments(documents, connection) {
    const model = resolveModel(this.model, connection);
    return model.upsertMany(documents);
  }

  async replaceEntityDocuments(entityType, documents, connection) {
    const model = resolveModel(this.model, connection);
    return model.replaceForEntity(entityType, documents);
  }

  async fetchRawDocuments({ entity, since, limit = 250, offset = 0 }, connection) {
    const model = resolveModel(this.model, connection);
    return model.fetchPage({ entityType: entity, since, limit, offset });
  }
}

export const searchDocumentsRepository = new SearchDocumentsRepository();

export default searchDocumentsRepository;
