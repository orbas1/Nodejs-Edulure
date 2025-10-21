import db from '../config/database.js';

const DEFAULT_SETTINGS = Object.freeze({
  profileVisibility: 'public',
  followApprovalRequired: false,
  messagePermission: 'followers',
  shareActivity: true,
  metadata: {}
});

const PROFILE_VISIBILITY_OPTIONS = new Set(['public', 'followers', 'private']);
const MESSAGE_PERMISSION_OPTIONS = new Set(['anyone', 'followers', 'none']);

function parseMetadata(value, fallback = {}) {
  if (value === null || value === undefined) {
    return { ...fallback };
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    return { ...fallback, ...value };
  }

  if (typeof value !== 'string') {
    return { ...fallback };
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return { ...fallback };
  }

  try {
    const parsed = JSON.parse(trimmed);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? { ...fallback, ...parsed }
      : { ...fallback };
  } catch (_error) {
    return { ...fallback };
  }
}

function serialiseMetadata(metadata) {
  if (metadata === null || metadata === undefined) {
    return JSON.stringify({});
  }

  if (typeof metadata === 'string') {
    const trimmed = metadata.trim();
    if (!trimmed) {
      return JSON.stringify({});
    }
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return JSON.stringify(parsed);
      }
    } catch (_error) {
      return JSON.stringify({});
    }
  }

  if (typeof metadata === 'object') {
    try {
      return JSON.stringify(metadata);
    } catch (_error) {
      return JSON.stringify({});
    }
  }

  return JSON.stringify({});
}

function normaliseBoolean(value, fallback) {
  if (value === undefined || value === null) {
    return Boolean(fallback);
  }
  return Boolean(value);
}

function normaliseSettings(input = {}) {
  const resolvedVisibility = PROFILE_VISIBILITY_OPTIONS.has(input.profileVisibility)
    ? input.profileVisibility
    : DEFAULT_SETTINGS.profileVisibility;

  const resolvedMessagePermission = MESSAGE_PERMISSION_OPTIONS.has(input.messagePermission)
    ? input.messagePermission
    : DEFAULT_SETTINGS.messagePermission;

  const metadata = parseMetadata(input.metadata, DEFAULT_SETTINGS.metadata);

  return {
    profileVisibility: resolvedVisibility,
    followApprovalRequired: normaliseBoolean(
      input.followApprovalRequired,
      DEFAULT_SETTINGS.followApprovalRequired
    ),
    messagePermission: resolvedMessagePermission,
    shareActivity: normaliseBoolean(input.shareActivity, DEFAULT_SETTINGS.shareActivity),
    metadata
  };
}

function mapRecord(record) {
  if (!record) {
    return null;
  }

  const normalized = normaliseSettings({
    profileVisibility: record.profile_visibility ?? record.profileVisibility,
    followApprovalRequired: record.follow_approval_required ?? record.followApprovalRequired,
    messagePermission: record.message_permission ?? record.messagePermission,
    shareActivity: record.share_activity ?? record.shareActivity,
    metadata: record.metadata
  });

  return {
    id: record.id ?? null,
    userId: record.user_id ?? record.userId ?? null,
    createdAt: record.created_at ?? record.createdAt ?? null,
    updatedAt: record.updated_at ?? record.updatedAt ?? null,
    ...normalized
  };
}

export default class UserPrivacySettingModel {
  static async getForUser(userId, connection = db) {
    const record = await connection('user_privacy_settings').where({ user_id: userId }).first();
    if (!record) {
      return { userId, ...normaliseSettings(DEFAULT_SETTINGS) };
    }
    return mapRecord(record);
  }

  static async upsert(userId, settings, connection = db) {
    const normalized = normaliseSettings(settings);
    const payload = {
      user_id: userId,
      profile_visibility: normalized.profileVisibility,
      follow_approval_required: normalized.followApprovalRequired,
      message_permission: normalized.messagePermission,
      share_activity: normalized.shareActivity,
      metadata: serialiseMetadata(normalized.metadata)
    };

    await connection('user_privacy_settings')
      .insert(payload)
      .onConflict('user_id')
      .merge({
        profile_visibility: payload.profile_visibility,
        follow_approval_required: payload.follow_approval_required,
        message_permission: payload.message_permission,
        share_activity: payload.share_activity,
        metadata: payload.metadata,
        updated_at: connection.fn.now()
      });

    const record = await connection('user_privacy_settings').where({ user_id: userId }).first();
    return mapRecord(record);
  }
}

export const __testables = {
  DEFAULT_SETTINGS,
  parseMetadata,
  serialiseMetadata,
  normaliseSettings,
  mapRecord
};
