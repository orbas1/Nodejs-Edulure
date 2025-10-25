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
    email: record.email,
    userId: record.user_id,
    role: record.role,
    firstName: record.first_name,
    lastName: record.last_name ?? null,
    persona: record.persona ?? null,
    dateOfBirth:
      record.date_of_birth instanceof Date
        ? record.date_of_birth.toISOString()
        : record.date_of_birth ?? null,
    goals: parseJson(record.goals, []),
    invites: parseJson(record.invites, []),
    preferences: parseJson(record.preferences, {}),
    metadata: parseJson(record.metadata, {}),
    termsAccepted: Boolean(record.terms_accepted),
    submittedAt: record.submitted_at,
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

function normaliseEmail(email) {
  if (!email) {
    return null;
  }
  return String(email).trim().toLowerCase();
}

function normaliseRole(role) {
  if (!role) {
    return null;
  }
  return String(role).trim().toLowerCase();
}

function serialiseJson(value, fallback) {
  if (value === null || value === undefined) {
    return fallback;
  }
  try {
    return JSON.stringify(value);
  } catch (_error) {
    return fallback;
  }
}

export default class LearnerOnboardingResponseModel {
  static async findByEmailAndRole(email, role, connection = db) {
    const normalisedEmail = normaliseEmail(email);
    const normalisedRole = normaliseRole(role);
    if (!normalisedEmail || !normalisedRole) {
      return null;
    }
    const record = await connection('learner_onboarding_responses')
      .where({ email: normalisedEmail, role: normalisedRole })
      .first();
    return mapRecord(record);
  }

  static async upsert(response, connection = db) {
    const normalisedEmail = normaliseEmail(response.email);
    const normalisedRole = normaliseRole(response.role);
    if (!normalisedEmail || !normalisedRole) {
      throw new Error('Email and role are required to upsert onboarding response');
    }
    const payload = {
      email: normalisedEmail,
      role: normalisedRole,
      user_id: response.userId ?? null,
      first_name: response.firstName,
      last_name: response.lastName ?? null,
      persona: response.persona ?? null,
      date_of_birth: response.dateOfBirth ? new Date(response.dateOfBirth) : null,
      goals: serialiseJson(response.goals ?? [], '[]'),
      invites: serialiseJson(response.invites ?? [], '[]'),
      preferences: serialiseJson(response.preferences ?? {}, '{}'),
      metadata: serialiseJson(response.metadata ?? {}, '{}'),
      terms_accepted: response.termsAccepted ? 1 : 0,
      submitted_at: response.submittedAt ?? connection.fn.now()
    };
    const existing = await this.findByEmailAndRole(normalisedEmail, normalisedRole, connection);
    if (existing) {
      await connection('learner_onboarding_responses')
        .where({ id: existing.id })
        .update({ ...payload, updated_at: connection.fn.now() });
      return this.findByEmailAndRole(normalisedEmail, normalisedRole, connection);
    }
    const [id] = await connection('learner_onboarding_responses').insert({
      ...payload,
      created_at: connection.fn.now(),
      updated_at: connection.fn.now()
    });
    const record = await connection('learner_onboarding_responses').where({ id }).first();
    return mapRecord(record);
  }

  static async linkUser(email, role, userId, connection = db) {
    const normalisedEmail = normaliseEmail(email);
    const normalisedRole = normaliseRole(role);
    if (!normalisedEmail || !normalisedRole || !userId) {
      return null;
    }
    await connection('learner_onboarding_responses')
      .where({ email: normalisedEmail, role: normalisedRole })
      .update({ user_id: userId, updated_at: connection.fn.now() });
    return this.findByEmailAndRole(normalisedEmail, normalisedRole, connection);
  }
}
