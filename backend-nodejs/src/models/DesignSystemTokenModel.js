import db from '../config/database.js';
import { safeJsonParse } from '../utils/modelUtils.js';

const TABLE = 'design_system_tokens';

const BASE_COLUMNS = [
  'id',
  'token_key as tokenKey',
  'token_value as tokenValue',
  'source',
  'context',
  'selector',
  'token_category as tokenCategory',
  'display_order as displayOrder',
  'metadata',
  'created_at as createdAt',
  'updated_at as updatedAt'
];

function normaliseNumber(value) {
  if (value === null || value === undefined) {
    return 0;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export default class DesignSystemTokenModel {
  static async listAll(connection = db) {
    const rows = await connection(TABLE)
      .select(BASE_COLUMNS)
      .orderBy([
        { column: 'display_order', order: 'asc' },
        { column: 'token_key', order: 'asc' },
        { column: 'source', order: 'asc' }
      ]);

    return rows.map((row) => ({
      ...row,
      context: row.context ?? null,
      metadata: safeJsonParse(row.metadata, {}),
      displayOrder: normaliseNumber(row.displayOrder)
    }));
  }
}
