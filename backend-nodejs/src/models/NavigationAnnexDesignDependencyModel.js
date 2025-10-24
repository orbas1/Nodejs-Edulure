import db from '../config/database.js';
import { ensureTinyInt, normaliseRoleScope } from './navigationAnnexHelpers.js';

const TABLE = 'navigation_annex_design_dependencies';

const BASE_COLUMNS = [
  'id',
  'nav_item_id as navItemId',
  'nav_item_label as navItemLabel',
  'nav_item_category as navItemCategory',
  'nav_item_route as navItemRoute',
  'role_scope as roleScope',
  'dependency_key as dependencyKey',
  'dependency_type as dependencyType',
  'value',
  'notes',
  'display_order as displayOrder',
  'created_at as createdAt',
  'updated_at as updatedAt'
];

export default class NavigationAnnexDesignDependencyModel {
  static async listAll(connection = db) {
    const rows = await connection(TABLE)
      .select(BASE_COLUMNS)
      .orderBy([
        { column: 'nav_item_id', order: 'asc' },
        { column: 'display_order', order: 'asc' },
        { column: 'dependency_key', order: 'asc' }
      ]);

    return rows.map((row) => ({
      ...row,
      roleScope: normaliseRoleScope(row.roleScope),
      displayOrder: ensureTinyInt(row.displayOrder, 0)
    }));
  }
}
