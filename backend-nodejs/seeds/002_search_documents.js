import { SearchDocumentService } from '../src/services/SearchDocumentService.js';

const silentLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {}
};

export async function seed(knex) {
  await knex.transaction(async (trx) => {
    const hasDocumentsTable = await trx.schema.hasTable('search_documents');
    if (!hasDocumentsTable) {
      return;
    }

    const hasQueueTable = await trx.schema.hasTable('search_document_refresh_queue');

    if (hasQueueTable) {
      await trx('search_document_refresh_queue').del();
    }

    await trx('search_documents').del();

    const service = new SearchDocumentService({
      dbClient: trx,
      loggerInstance: silentLogger
    });

    await service.rebuild({
      trx,
      entityTypes: ['courses', 'communities', 'ebooks', 'tutors'],
      reason: 'bootstrap',
      runAt: new Date()
    });
  });
}
