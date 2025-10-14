import db from '../config/database.js';

const DEFAULT_SETTINGS = {
  profileVisibility: 'public',
  followApprovalRequired: false,
  messagePermission: 'followers',
  shareActivity: true,
  metadata: {}
};

function parseJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

function mapRecord(record) {
  if (!record) {
    return null;
  }
  return {
    id: record.id,
    userId: record.user_id,
    profileVisibility: record.profile_visibility,
    followApprovalRequired: Boolean(record.follow_approval_required),
    messagePermission: record.message_permission,
    shareActivity: Boolean(record.share_activity),
    metadata: parseJson(record.metadata, {}),
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

export default class UserPrivacySettingModel {
  static async getForUser(userId, connection = db) {
    const record = await connection('user_privacy_settings').where({ user_id: userId }).first();
    if (!record) {
      return { ...DEFAULT_SETTINGS, userId };
    }
    return mapRecord(record);
  }

  static async upsert(userId, settings, connection = db) {
    const payload = {
      user_id: userId,
      profile_visibility: settings.profileVisibility ?? DEFAULT_SETTINGS.profileVisibility,
      follow_approval_required:
        settings.followApprovalRequired ?? DEFAULT_SETTINGS.followApprovalRequired,
      message_permission: settings.messagePermission ?? DEFAULT_SETTINGS.messagePermission,
      share_activity: settings.shareActivity ?? DEFAULT_SETTINGS.shareActivity,
      metadata: JSON.stringify(settings.metadata ?? DEFAULT_SETTINGS.metadata)
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
