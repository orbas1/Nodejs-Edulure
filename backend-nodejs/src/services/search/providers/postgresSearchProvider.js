import SearchDocumentModel from '../../../models/SearchDocumentModel.js';

export const postgresSearchProvider = {
  name: 'postgres',
  getSupportedEntities() {
    return SearchDocumentModel.getSupportedEntities();
  },
  async search(entity, params) {
    return SearchDocumentModel.search(entity, params);
  }
};

export default postgresSearchProvider;
