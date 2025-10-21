import db from '../config/database.js';

const BASE_COLUMNS = [
  'id',
  'user_id as userId',
  'display_name as displayName',
  'tagline',
  'location',
  'avatar_url as avatarUrl',
  'banner_url as bannerUrl',
  'bio',
  'social_links as socialLinks',
  'metadata',
  'created_at as createdAt',
  'updated_at as updatedAt'
];

function serialiseJson(value, fallback = null) {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch (_error) {
    return fallback ?? '{}';
  }
}

function parseJsonColumn(value, fallback) {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (Array.isArray(fallback) && Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(fallback) && !Array.isArray(parsed)) {
      return fallback;
    }
    if (!Array.isArray(fallback) && typeof fallback === 'object' && (parsed === null || typeof parsed !== 'object')) {
      return fallback;
    }
    return parsed;
  } catch (_error) {
    return fallback;
  }
}

export function mapUserProfileRecord(record) {
  if (!record) {
    return null;
  }

  return {
    id: record.id,
    userId: record.userId ?? record.user_id,
    displayName: record.displayName ?? record.display_name ?? null,
    tagline: record.tagline ?? null,
    location: record.location ?? null,
    avatarUrl: record.avatarUrl ?? record.avatar_url ?? null,
    bannerUrl: record.bannerUrl ?? record.banner_url ?? null,
    bio: record.bio ?? null,
    socialLinks: parseJsonColumn(record.socialLinks ?? record.social_links, []),
    metadata: parseJsonColumn(record.metadata, {}),
    createdAt: record.createdAt ?? record.created_at ?? null,
    updatedAt: record.updatedAt ?? record.updated_at ?? null
  };
}

export default class UserProfileModel {
  static async findByUserId(userId, connection = db) {
    const record = await connection('user_profiles').select(BASE_COLUMNS).where({ user_id: userId }).first();
    return mapUserProfileRecord(record);
  }

  static async upsert(userId, profile, connection = db) {
    const payload = {
      display_name: profile.displayName ?? null,
      tagline: profile.tagline ?? null,
      location: profile.location ?? null,
      avatar_url: profile.avatarUrl ?? null,
      banner_url: profile.bannerUrl ?? null,
      bio: profile.bio ?? null,
      social_links: serialiseJson(profile.socialLinks ?? [], '[]'),
      metadata: serialiseJson(profile.metadata ?? {}, '{}')
    };

    const existing = await connection('user_profiles').where({ user_id: userId }).first();
    if (existing) {
      await connection('user_profiles').where({ user_id: userId }).update(payload);
      return this.findByUserId(userId, connection);
    }

    await connection('user_profiles').insert({ ...payload, user_id: userId });
    return this.findByUserId(userId, connection);
  }
}

export const __testables = {
  parseJsonColumn,
  mapUserProfileRecord
};
