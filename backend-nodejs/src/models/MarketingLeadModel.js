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
    fullName: record.full_name ?? null,
    company: record.company ?? null,
    persona: record.persona ?? null,
    goal: record.goal ?? null,
    ctaSource: record.cta_source ?? null,
    blockSlug: record.block_slug ?? null,
    status: record.status,
    metadata: parseJson(record.metadata, {}),
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

export default class MarketingLeadModel {
  static async create(lead, connection = db) {
    if (!lead?.email) {
      throw new Error('Email is required to create a marketing lead');
    }

    const payload = {
      email: lead.email,
      full_name: lead.fullName ?? lead.full_name ?? null,
      company: lead.company ?? null,
      persona: lead.persona ?? null,
      goal: lead.goal ?? null,
      cta_source: lead.ctaSource ?? lead.cta_source ?? null,
      block_slug: lead.blockSlug ?? lead.block_slug ?? null,
      status: lead.status ?? 'new',
      metadata: JSON.stringify(lead.metadata ?? {})
    };

    const [identifier] = await connection('marketing_leads').insert(payload).returning('id');
    const id = typeof identifier === 'object' ? identifier.id : identifier;
    const record = await connection('marketing_leads').where({ id }).first();
    return mapRecord(record);
  }

  static async listRecent(limit = 20, connection = db) {
    const rows = await connection('marketing_leads')
      .select('*')
      .orderBy('created_at', 'desc')
      .limit(limit);
    return rows.map((row) => mapRecord(row)).filter(Boolean);
  }
}
