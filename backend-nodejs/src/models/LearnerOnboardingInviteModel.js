import db from '../config/database.js';

function parseJson(value, fallback) {
  if (value === null || value === undefined) {
    return fallback;
  }
  if (typeof value === 'object') {
    return value;
  }
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
    inviteCode: record.invite_code,
    email: record.email,
    communityId: record.community_id,
    status: record.status,
    expiresAt: record.expires_at,
    claimedAt: record.claimed_at,
    userId: record.user_id,
    metadata: parseJson(record.metadata, {}),
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

function applyActiveFilters(query, connection) {
  return query
    .whereIn('status', ['pending'])
    .andWhere((builder) => {
      builder.whereNull('expires_at').orWhere('expires_at', '>', connection.fn.now());
    });
}

export default class LearnerOnboardingInviteModel {
  static async listActiveForEmail(email, connection = db) {
    if (!email) {
      return [];
    }
    const rows = await applyActiveFilters(
      connection('learner_onboarding_invites').where({ email }),
      connection
    ).orderBy('id', 'asc');
    return rows.map((row) => mapRecord(row)).filter(Boolean);
  }

  static async findPendingByCode(code, connection = db) {
    if (!code) {
      return null;
    }
    const record = await applyActiveFilters(
      connection('learner_onboarding_invites').where({ invite_code: code }),
      connection
    ).first();
    return mapRecord(record);
  }

  static async markAccepted(inviteId, { userId } = {}, connection = db) {
    if (!inviteId) {
      return null;
    }
    await connection('learner_onboarding_invites')
      .where({ id: inviteId })
      .update({
        status: 'accepted',
        claimed_at: connection.fn.now(),
        user_id: userId ?? null,
        updated_at: connection.fn.now()
      });
    const record = await connection('learner_onboarding_invites').where({ id: inviteId }).first();
    return mapRecord(record);
  }

  static async expireInvite(inviteId, connection = db) {
    if (!inviteId) {
      return null;
    }
    await connection('learner_onboarding_invites')
      .where({ id: inviteId })
      .update({ status: 'expired', updated_at: connection.fn.now() });
    const record = await connection('learner_onboarding_invites').where({ id: inviteId }).first();
    return mapRecord(record);
  }
}
