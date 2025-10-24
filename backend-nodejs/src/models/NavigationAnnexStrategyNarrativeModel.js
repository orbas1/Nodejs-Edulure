import db from '../config/database.js';
import { ensureTinyInt, normaliseRoleScope } from './navigationAnnexHelpers.js';

const TABLE = 'navigation_annex_strategy_narratives';

const BASE_COLUMNS = [
  'id',
  'nav_item_id as navItemId',
  'nav_item_label as navItemLabel',
  'nav_item_category as navItemCategory',
  'nav_item_route as navItemRoute',
  'role_scope as roleScope',
  'narrative_key as narrativeKey',
  'pillar',
  'narrative',
  'display_order as displayOrder',
  'created_at as createdAt',
  'updated_at as updatedAt'
];

export default class NavigationAnnexStrategyNarrativeModel {
  static async listAll(connection = db) {
    const rows = await connection(TABLE)
      .select(BASE_COLUMNS)
      .orderBy([
        { column: 'display_order', order: 'asc' },
        { column: 'narrative_key', order: 'asc' }
      ]);

    return rows.map((row) => ({
      ...row,
      roleScope: normaliseRoleScope(row.roleScope),
      displayOrder: ensureTinyInt(row.displayOrder, 0)
    }));
  }
}
