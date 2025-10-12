import db from '../config/database.js';
import logger from '../config/logger.js';
import SavedSearchModel from '../models/SavedSearchModel.js';

export class SavedSearchService {
  constructor({ savedSearchModel = SavedSearchModel, dbClient = db, loggerInstance = logger } = {}) {
    this.model = savedSearchModel;
    this.db = dbClient;
    this.logger = loggerInstance;
  }

  async list(userId) {
    return this.model.listByUser(userId, this.db);
  }

  async create(userId, payload) {
    return this.db.transaction(async (trx) => {
      const existing = await trx('saved_searches').where({ user_id: userId, name: payload.name }).first();
      if (existing) {
        const error = new Error('A saved search with this name already exists.');
        error.status = 409;
        throw error;
      }
      const created = await this.model.create({ ...payload, userId }, trx);
      this.logger.info({ savedSearchId: created.id, userId }, 'Saved search created');
      return created;
    });
  }

  async update(userId, savedSearchId, payload) {
    return this.db.transaction(async (trx) => {
      if (payload.name) {
        const conflict = await trx('saved_searches')
          .where({ user_id: userId, name: payload.name })
          .andWhereNot('id', savedSearchId)
          .first();
        if (conflict) {
          const error = new Error('A saved search with this name already exists.');
          error.status = 409;
          throw error;
        }
      }
      const updated = await this.model.update(savedSearchId, { ...payload, userId }, trx);
      if (!updated) {
        const error = new Error('Saved search not found.');
        error.status = 404;
        throw error;
      }
      this.logger.info({ savedSearchId, userId }, 'Saved search updated');
      return updated;
    });
  }

  async delete(userId, savedSearchId) {
    return this.db.transaction(async (trx) => {
      const deleted = await this.model.delete(savedSearchId, userId, trx);
      if (!deleted) {
        const error = new Error('Saved search not found.');
        error.status = 404;
        throw error;
      }
      this.logger.info({ savedSearchId, userId }, 'Saved search deleted');
      return true;
    });
  }

  async touchUsage(userId, savedSearchId) {
    return this.db('saved_searches')
      .where({ id: savedSearchId, user_id: userId })
      .update({ last_used_at: this.db.fn.now() });
  }

  async get(userId, savedSearchId) {
    const search = await this.model.findById(savedSearchId, userId, this.db);
    if (!search) {
      const error = new Error('Saved search not found.');
      error.status = 404;
      throw error;
    }
    return search;
  }
}

export const savedSearchService = new SavedSearchService();

export default savedSearchService;
