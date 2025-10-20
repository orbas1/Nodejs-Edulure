import db from '../config/database.js';
import {
  ensureIntegerInRange,
  ensureNonEmptyString,
  normaliseBoolean,
  normaliseOptionalString,
  normaliseSlug,
  readJsonColumn,
  writeJsonColumn
} from '../utils/modelUtils.js';

const TABLE = 'community_channels';
const CHANNEL_COLUMNS = [
  'cc.id',
  'cc.community_id as communityId',
  'cc.name',
  'cc.slug',
  'cc.channel_type as channelType',
  'cc.description',
  'cc.is_default as isDefault',
  'cc.metadata',
  'cc.created_at as createdAt',
  'cc.updated_at as updatedAt'
];

const CHANNEL_TYPES = new Set(['general', 'classroom', 'resources', 'announcements', 'events']);

function normaliseChannelType(value) {
  if (!value) {
    return 'general';
  }

  const candidate = String(value).trim().toLowerCase();
  if (!CHANNEL_TYPES.has(candidate)) {
    throw new Error(`channelType '${value}' is not supported`);
  }
  return candidate;
}

function mapRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    communityId: row.communityId ?? row.community_id ?? null,
    name: row.name,
    slug: row.slug,
    channelType: row.channelType ?? row.channel_type ?? 'general',
    description: row.description ?? null,
    isDefault: Boolean(row.isDefault ?? row.is_default ?? false),
    metadata: readJsonColumn(row.metadata, {}),
    createdAt: row.createdAt ?? row.created_at ?? null,
    updatedAt: row.updatedAt ?? row.updated_at ?? null
  };
}

function buildInsertPayload(channel) {
  return {
    community_id: ensureIntegerInRange(channel.communityId, { fieldName: 'communityId', min: 1 }),
    name: ensureNonEmptyString(channel.name, { fieldName: 'name', maxLength: 120 }),
    slug: normaliseSlug(channel.slug ?? channel.name, { maxLength: 80 }),
    channel_type: normaliseChannelType(channel.channelType),
    description: normaliseOptionalString(channel.description, { maxLength: 500 }),
    is_default: normaliseBoolean(channel.isDefault),
    metadata: writeJsonColumn(channel.metadata, {})
  };
}

function buildUpdatePayload(updates) {
  const payload = {};

  if (updates.name !== undefined) {
    payload.name = ensureNonEmptyString(updates.name, { fieldName: 'name', maxLength: 120 });
  }

  if (updates.slug !== undefined) {
    payload.slug = normaliseSlug(updates.slug, { maxLength: 80 });
  }

  if (updates.channelType !== undefined) {
    payload.channel_type = normaliseChannelType(updates.channelType);
  }

  if (updates.description !== undefined) {
    payload.description = normaliseOptionalString(updates.description, { maxLength: 500 });
  }

  if (updates.isDefault !== undefined) {
    payload.is_default = normaliseBoolean(updates.isDefault);
  }

  if (updates.metadata !== undefined) {
    payload.metadata = writeJsonColumn(updates.metadata, {});
  }

  return payload;
}

function buildQuery(connection) {
  return connection(`${TABLE} as cc`).select(CHANNEL_COLUMNS);
}

export default class CommunityChannelModel {
  static async create(channel, connection = db) {
    const payload = buildInsertPayload(channel);
    const [id] = await connection(TABLE).insert(payload);
    return this.findById(id, connection);
  }

  static async findById(id, connection = db) {
    const row = await buildQuery(connection).where('cc.id', id).first();
    return mapRow(row);
  }

  static async update(id, updates, connection = db) {
    const payload = buildUpdatePayload(updates ?? {});

    if (!Object.keys(payload).length) {
      return this.findById(id, connection);
    }

    await connection(TABLE)
      .where({ id })
      .update({ ...payload, updated_at: connection.fn.now() });

    return this.findById(id, connection);
  }

  static async delete(id, connection = db) {
    return connection(TABLE).where({ id }).del();
  }

  static async listByCommunity(communityId, connection = db) {
    const community = ensureIntegerInRange(communityId, { fieldName: 'communityId', min: 1 });
    const rows = await buildQuery(connection)
      .where('cc.community_id', community)
      .orderBy('cc.is_default', 'desc')
      .orderBy('cc.name');

    return rows.map(mapRow);
  }

  static async findDefault(communityId, connection = db) {
    const community = ensureIntegerInRange(communityId, { fieldName: 'communityId', min: 1 });
    const row = await buildQuery(connection)
      .where('cc.community_id', community)
      .andWhere('cc.is_default', true)
      .first();
    return mapRow(row);
  }
}
