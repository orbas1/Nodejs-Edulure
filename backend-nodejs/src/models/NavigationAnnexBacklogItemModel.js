import db from '../config/database.js';
import { ensureTinyInt, normaliseRoleScope, normaliseStringArray } from './navigationAnnexHelpers.js';

const TABLE = 'navigation_annex_backlog_items';

const BASE_COLUMNS = [
  'id',
  'nav_item_id as navItemId',
  'nav_item_label as navItemLabel',
  'nav_item_category as navItemCategory',
  'nav_item_route as navItemRoute',
  'role_scope as roleScope',
  'epic_id as epicId',
  'summary',
  'backlog_ref as backlogRef',
  'impacted_files as impactedFiles',
  'priority',
  'display_order as displayOrder',
  'created_at as createdAt',
  'updated_at as updatedAt'
];

export default class NavigationAnnexBacklogItemModel {
  static async listAll(connection = db) {
    const rows = await connection(TABLE)
      .select(BASE_COLUMNS)
      .orderBy([
        { column: 'priority', order: 'asc' },
        { column: 'display_order', order: 'asc' },
        { column: 'epic_id', order: 'asc' }
      ]);

    return rows.map((row) => ({
      ...row,
      roleScope: normaliseRoleScope(row.roleScope),
      impactedFiles: normaliseStringArray(row.impactedFiles),
      priority: ensureTinyInt(row.priority, 99),
      displayOrder: ensureTinyInt(row.displayOrder, 0)
    }));
  }
}
