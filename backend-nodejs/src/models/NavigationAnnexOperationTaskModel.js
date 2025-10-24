import db from '../config/database.js';
import { ensureTinyInt, normaliseRoleScope } from './navigationAnnexHelpers.js';

const TABLE = 'navigation_annex_operation_tasks';

const BASE_COLUMNS = [
  'id',
  'nav_item_id as navItemId',
  'nav_item_label as navItemLabel',
  'nav_item_category as navItemCategory',
  'nav_item_route as navItemRoute',
  'role_scope as roleScope',
  'task_key as taskKey',
  'label',
  'cadence',
  'runbook_section as runbookSection',
  'href',
  'owner',
  'priority',
  'display_order as displayOrder',
  'include_in_checklist as includeInChecklist',
  'created_at as createdAt',
  'updated_at as updatedAt'
];

export default class NavigationAnnexOperationTaskModel {
  static async listAll(connection = db) {
    const rows = await connection(TABLE)
      .select(BASE_COLUMNS)
      .orderBy([
        { column: 'priority', order: 'asc' },
        { column: 'display_order', order: 'asc' },
        { column: 'task_key', order: 'asc' }
      ]);

    return rows.map((row) => ({
      ...row,
      roleScope: normaliseRoleScope(row.roleScope),
      priority: ensureTinyInt(row.priority, 99),
      displayOrder: ensureTinyInt(row.displayOrder, 0),
      includeInChecklist: row.includeInChecklist ? 1 : 0
    }));
  }
}
