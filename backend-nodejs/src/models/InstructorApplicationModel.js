import db from '../config/database.js';

const TABLE = 'instructor_applications';

function parseJson(value, fallback) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value;
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(fallback)) {
      return Array.isArray(parsed) ? parsed : fallback;
    }
    return parsed && typeof parsed === 'object' ? parsed : fallback;
  } catch (_error) {
    return fallback;
  }
}

function deserialize(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    status: row.status,
    stage: row.stage,
    motivation: row.motivation ?? null,
    portfolioUrl: row.portfolio_url ?? null,
    experienceYears: Number(row.experience_years ?? 0),
    teachingFocus: parseJson(row.teaching_focus, []),
    availability: parseJson(row.availability, {}),
    marketingAssets: parseJson(row.marketing_assets, []),
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
    decisionNote: row.decision_note ?? null,
    metadata: parseJson(row.metadata, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export default class InstructorApplicationModel {
  static deserialize(row) {
    return deserialize(row);
  }

  static async findByUserId(userId, connection = db) {
    if (!userId) return null;
    const row = await connection(TABLE).select('*').where({ user_id: userId }).first();
    return deserialize(row);
  }

  static async create(application, connection = db) {
    const payload = {
      user_id: application.userId,
      status: application.status ?? 'draft',
      stage: application.stage ?? 'intake',
      motivation: application.motivation ?? null,
      portfolio_url: application.portfolioUrl ?? null,
      experience_years: application.experienceYears ?? 0,
      teaching_focus: JSON.stringify(application.teachingFocus ?? []),
      availability: JSON.stringify(application.availability ?? {}),
      marketing_assets: JSON.stringify(application.marketingAssets ?? []),
      submitted_at: application.submittedAt ?? null,
      reviewed_at: application.reviewedAt ?? null,
      decision_note: application.decisionNote ?? null,
      metadata: JSON.stringify(application.metadata ?? {})
    };
    const [id] = await connection(TABLE).insert(payload);
    const row = await connection(TABLE).select('*').where({ id }).first();
    return deserialize(row);
  }

  static async updateById(id, updates, connection = db) {
    if (!id) return null;
    const payload = {};
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.stage !== undefined) payload.stage = updates.stage;
    if (updates.motivation !== undefined) payload.motivation = updates.motivation ?? null;
    if (updates.portfolioUrl !== undefined) payload.portfolio_url = updates.portfolioUrl ?? null;
    if (updates.experienceYears !== undefined) payload.experience_years = updates.experienceYears ?? 0;
    if (updates.teachingFocus !== undefined) payload.teaching_focus = JSON.stringify(updates.teachingFocus ?? []);
    if (updates.availability !== undefined) payload.availability = JSON.stringify(updates.availability ?? {});
    if (updates.marketingAssets !== undefined) payload.marketing_assets = JSON.stringify(updates.marketingAssets ?? []);
    if (updates.submittedAt !== undefined) payload.submitted_at = updates.submittedAt ?? null;
    if (updates.reviewedAt !== undefined) payload.reviewed_at = updates.reviewedAt ?? null;
    if (updates.decisionNote !== undefined) payload.decision_note = updates.decisionNote ?? null;
    if (updates.metadata !== undefined) payload.metadata = JSON.stringify(updates.metadata ?? {});
    if (Object.keys(payload).length) {
      await connection(TABLE).where({ id }).update(payload);
    }
    const row = await connection(TABLE).select('*').where({ id }).first();
    return deserialize(row);
  }

  static async upsertForUser(userId, updates, connection = db) {
    if (!userId) return null;
    const existing = await this.findByUserId(userId, connection);
    if (existing) {
      return this.updateById(existing.id, updates, connection);
    }
    return this.create({ ...updates, userId }, connection);
  }
}
