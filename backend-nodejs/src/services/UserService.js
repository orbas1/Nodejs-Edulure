import db from '../config/database.js';
import UserModel from '../models/UserModel.js';
import UserProfileModel from '../models/UserProfileModel.js';

function parseJson(value, fallback) {
  if (!value && value !== 0) {
    return fallback;
  }

  if (typeof value === 'object') {
    return value;
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (_error) {
      return fallback;
    }
  }

  return fallback;
}

function parseAddress(value) {
  if (!value) {
    return null;
  }

  if (typeof value === 'object') {
    return value;
  }

  const parsed = parseJson(value, null);
  if (parsed) {
    return parsed;
  }

  return { formatted: value };
}

function parseSocialLinks(raw) {
  const parsed = parseJson(raw, []);
  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .map((entry) => ({
      label: entry?.label ?? null,
      url: entry?.url ?? null,
      handle: entry?.handle ?? null
    }))
    .filter((entry) => entry.url);
}

function composeUser(userRecord, profileRecord) {
  if (!userRecord) {
    return null;
  }

  const profile = profileRecord
    ? {
        id: profileRecord.id,
        displayName: profileRecord.displayName ?? null,
        tagline: profileRecord.tagline ?? null,
        location: profileRecord.location ?? null,
        avatarUrl: profileRecord.avatarUrl ?? null,
        bannerUrl: profileRecord.bannerUrl ?? null,
        bio: profileRecord.bio ?? null,
        socialLinks: parseSocialLinks(profileRecord.socialLinks),
        metadata: parseJson(profileRecord.metadata, {}),
        createdAt: profileRecord.createdAt ?? null,
        updatedAt: profileRecord.updatedAt ?? null
      }
    : null;

  return {
    ...userRecord,
    address: parseAddress(userRecord.address),
    profile
  };
}

export default class UserService {
  static async list(limit, offset) {
    return UserModel.list({ limit, offset });
  }

  static async getById(id) {
    const user = await UserModel.findById(id);
    if (!user) {
      const error = new Error('User not found');
      error.status = 404;
      throw error;
    }
    const profile = await UserProfileModel.findByUserId(id);
    return composeUser(user, profile);
  }

  static async updateById(id, payload) {
    return db.transaction(async (trx) => {
      const userUpdates = {
        firstName: payload.firstName,
        lastName: payload.lastName,
        age: payload.age,
        address: payload.address
      };

      await UserModel.updateById(id, userUpdates, trx);

      if (payload.profile) {
        const profilePayload = {
          displayName: payload.profile.displayName,
          tagline: payload.profile.tagline,
          location: payload.profile.location,
          avatarUrl: payload.profile.avatarUrl,
          bannerUrl: payload.profile.bannerUrl,
          bio: payload.profile.bio,
          socialLinks: Array.isArray(payload.profile.socialLinks)
            ? payload.profile.socialLinks
                .filter((link) => link && link.url)
                .map((link) => ({
                  label: link.label ?? null,
                  url: link.url,
                  handle: link.handle ?? null
                }))
            : [],
          metadata:
            typeof payload.profile.metadata === 'object' && payload.profile.metadata !== null
              ? payload.profile.metadata
              : {}
        };

        await UserProfileModel.upsert(id, profilePayload, trx);
      }

      const nextUser = await UserModel.findById(id, trx);
      if (!nextUser) {
        const error = new Error('User not found');
        error.status = 404;
        throw error;
      }
      const nextProfile = await UserProfileModel.findByUserId(id, trx);
      return composeUser(nextUser, nextProfile);
    });
  }
}
