import db from '../config/database.js';

function parseJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function mapRecord(record) {
  if (!record) return null;
  return {
    id: record.id,
    communityId: record.community_id,
    roleKey: record.role_key,
    name: record.name,
    description: record.description,
    permissions: parseJson(record.permissions, {}),
    isDefaultAssignable: Boolean(record.is_default_assignable),
    createdBy: record.created_by,
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

export default class CommunityRoleDefinitionModel {
  static async create(definition, connection = db) {
    const payload = {
      community_id: definition.communityId,
      role_key: definition.roleKey,
      name: definition.name,
      description: definition.description ?? null,
      permissions: JSON.stringify(definition.permissions ?? {}),
      is_default_assignable: definition.isDefaultAssignable ?? true,
      created_by: definition.createdBy ?? null
    };
    const [id] = await connection('community_role_definitions').insert(payload);
    return this.findById(id, connection);
  }

  static async updateById(id, updates, connection = db) {
    const payload = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.description !== undefined) payload.description = updates.description ?? null;
    if (updates.permissions !== undefined) payload.permissions = JSON.stringify(updates.permissions ?? {});
    if (updates.isDefaultAssignable !== undefined)
      payload.is_default_assignable = updates.isDefaultAssignable ? 1 : 0;

    if (Object.keys(payload).length === 0) {
      return this.findById(id, connection);
    }

    await connection('community_role_definitions')
      .where({ id })
      .update({ ...payload, updated_at: connection.fn.now() });

    return this.findById(id, connection);
  }

  static async deleteById(id, connection = db) {
    return connection('community_role_definitions').where({ id }).del();
  }

  static async listByCommunity(communityId, connection = db) {
    const rows = await connection('community_role_definitions')
      .where({ community_id: communityId })
      .orderBy('name', 'asc');
    return rows.map((row) => mapRecord(row));
  }

  static async findByCommunityAndKey(communityId, roleKey, connection = db) {
    const record = await connection('community_role_definitions')
      .where({ community_id: communityId, role_key: roleKey })
      .first();
    return mapRecord(record);
  }

  static async findById(id, connection = db) {
    const record = await connection('community_role_definitions').where({ id }).first();
    return mapRecord(record);
  }
}
