import db from '../config/database.js';

const TABLE = 'creation_project_collaborators';

const BASE_COLUMNS = [
  'id',
  'project_id as projectId',
  'user_id as userId',
  'role',
  'permissions',
  'added_at as addedAt',
  'removed_at as removedAt'
];

function parsePermissions(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}

export default class CreationProjectCollaboratorModel {
  static async add({ projectId, userId, role = 'editor', permissions = [] }, connection = db) {
    await connection(TABLE)
      .insert({
        project_id: projectId,
        user_id: userId,
        role,
        permissions: JSON.stringify(permissions)
      })
      .onConflict(['project_id', 'user_id'])
      .merge({
        role,
        permissions: JSON.stringify(permissions),
        removed_at: null,
        added_at: connection.fn.now()
      });

    return this.findByProjectAndUser(projectId, userId, connection);
  }

  static async remove(projectId, userId, connection = db) {
    await connection(TABLE)
      .where({ project_id: projectId, user_id: userId })
      .update({ removed_at: connection.fn.now() });
  }

  static async findByProjectAndUser(projectId, userId, connection = db) {
    const row = await connection(TABLE)
      .select(BASE_COLUMNS)
      .where({ project_id: projectId, user_id: userId })
      .first();
    return row ? this.deserialize(row) : null;
  }

  static async listByProject(projectId, { includeRemoved = false } = {}, connection = db) {
    const query = connection(TABLE).select(BASE_COLUMNS).where({ project_id: projectId });
    if (!includeRemoved) {
      query.andWhereNull('removed_at');
    }
    const rows = await query.orderBy('role', 'asc').orderBy('added_at', 'asc');
    return rows.map((row) => this.deserialize(row));
  }

  static async listActiveProjectIdsForUser(userId, connection = db) {
    const rows = await connection(TABLE)
      .select(['project_id as projectId'])
      .where({ user_id: userId })
      .whereNull('removed_at');
    return rows.map((row) => row.projectId);
  }

  static async hasActiveCollaborator(projectId, userId, connection = db) {
    const row = await connection(TABLE)
      .where({ project_id: projectId, user_id: userId })
      .whereNull('removed_at')
      .first();
    return Boolean(row);
  }

  static deserialize(record) {
    return {
      ...record,
      permissions: parsePermissions(record.permissions)
    };
  }
}

