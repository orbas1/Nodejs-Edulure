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

export default class UserProfileModel {
  static async findByUserId(userId, connection = db) {
    return connection('user_profiles').select(BASE_COLUMNS).where({ user_id: userId }).first();
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
