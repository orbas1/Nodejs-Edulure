import db from '../config/database.js';
import { ensureTinyInt } from './navigationAnnexHelpers.js';

const TABLE = 'navigation_annex_strategy_metrics';

const BASE_COLUMNS = [
  'id',
  'narrative_id as narrativeId',
  'metric_key as metricKey',
  'label',
  'baseline',
  'target',
  'unit',
  'display_order as displayOrder',
  'created_at as createdAt',
  'updated_at as updatedAt'
];

export default class NavigationAnnexStrategyMetricModel {
  static async listAll(connection = db) {
    const rows = await connection(TABLE)
      .select(BASE_COLUMNS)
      .orderBy([
        { column: 'display_order', order: 'asc' },
        { column: 'metric_key', order: 'asc' }
      ]);

    return rows.map((row) => ({
      ...row,
      displayOrder: ensureTinyInt(row.displayOrder, 0)
    }));
  }
}
