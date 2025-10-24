import db from '../config/database.js';
import { safeJsonParse } from '../utils/modelUtils.js';

const TABLE = 'ux_research_insights';

const BASE_COLUMNS = [
  'id',
  'slug',
  'title',
  'status',
  'recorded_at as recordedAt',
  'owner',
  'summary',
  'tokens_impacted as tokensImpacted',
  'documents',
  'participants',
  'evidence_url as evidenceUrl',
  'metadata',
  'created_at as createdAt',
  'updated_at as updatedAt'
];

function normaliseDate(value) {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return String(value);
}

export default class UxResearchInsightModel {
  static async listAll(connection = db) {
    const rows = await connection(TABLE)
      .select(BASE_COLUMNS)
      .orderBy([
        { column: 'recorded_at', order: 'desc' },
        { column: 'slug', order: 'asc' }
      ]);

    return rows.map((row) => ({
      ...row,
      recordedAt: normaliseDate(row.recordedAt),
      tokensImpacted: safeJsonParse(row.tokensImpacted, []),
      documents: safeJsonParse(row.documents, []),
      participants: safeJsonParse(row.participants, []),
      evidenceUrl: row.evidenceUrl ?? null,
      metadata: safeJsonParse(row.metadata, {})
    }));
  }
}
