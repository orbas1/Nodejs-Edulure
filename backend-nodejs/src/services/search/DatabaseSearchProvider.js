import SearchDocumentModel from '../../models/SearchDocumentModel.js';

export class DatabaseSearchProvider {
  constructor({ documentModel = SearchDocumentModel } = {}) {
    this.documentModel = documentModel;
  }

  get name() {
    return 'edulure-database';
  }

  getSupportedEntities() {
    if (typeof this.documentModel.getSupportedEntities === 'function') {
      return this.documentModel.getSupportedEntities();
    }
    return [];
  }

  async search(entityType, options) {
    return this.documentModel.search(entityType, options);
  }
}

export function createDatabaseSearchProvider(options) {
  return new DatabaseSearchProvider(options);
}

export default DatabaseSearchProvider;
