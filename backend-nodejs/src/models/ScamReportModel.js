import crypto from 'node:crypto';

import db from '../config/database.js';

function parseJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    publicId: row.publicId,
    reporterId: row.reporterId ?? undefined,
    entityType: row.entityType,
    entityId: row.entityId,
    communityId: row.communityId ?? undefined,
    status: row.status,
    riskScore: typeof row.riskScore === 'number' ? row.riskScore : Number(row.riskScore ?? 0),
    reason: row.reason,
    description: row.description ?? undefined,
    metadata: parseJson(row.metadata, {}),
    handledBy: row.handledBy ?? undefined,
    resolvedAt: row.resolvedAt ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export default class ScamReportModel {
  static async create(report, connection = db) {
    const payload = {
      public_id: report.publicId ?? crypto.randomUUID(),
      reporter_id: report.reporterId ?? null,
      entity_type: report.entityType,
      entity_id: report.entityId,
      community_id: report.communityId ?? null,
      status: report.status ?? 'pending',
      risk_score: report.riskScore ?? 0,
      reason: report.reason,
      description: report.description ?? null,
      metadata: JSON.stringify(report.metadata ?? {}),
      handled_by: report.handledBy ?? null,
      resolved_at: report.resolvedAt ?? null
    };

    const [id] = await connection('scam_reports').insert(payload);
    const row = await connection('scam_reports')
      .select({
        id: 'id',
        publicId: 'public_id',
        reporterId: 'reporter_id',
        entityType: 'entity_type',
        entityId: 'entity_id',
        communityId: 'community_id',
        status: 'status',
        riskScore: 'risk_score',
        reason: 'reason',
        description: 'description',
        metadata: 'metadata',
        handledBy: 'handled_by',
        resolvedAt: 'resolved_at',
        createdAt: 'created_at',
        updatedAt: 'updated_at'
      })
      .where({ id })
      .first();
    return mapRow(row);
  }

  static async findByPublicId(publicId, connection = db) {
    const row = await connection('scam_reports')
      .select({
        id: 'id',
        publicId: 'public_id',
        reporterId: 'reporter_id',
        entityType: 'entity_type',
        entityId: 'entity_id',
        communityId: 'community_id',
        status: 'status',
        riskScore: 'risk_score',
        reason: 'reason',
        description: 'description',
        metadata: 'metadata',
        handledBy: 'handled_by',
        resolvedAt: 'resolved_at',
        createdAt: 'created_at',
        updatedAt: 'updated_at'
      })
      .where({ public_id: publicId })
      .first();
    return mapRow(row);
  }

  static async updateById(id, updates, connection = db) {
    const payload = {
      updated_at: connection.fn.now()
    };

    if (updates.status) {
      payload.status = updates.status;
    }
    if (updates.riskScore !== undefined) {
      payload.risk_score = updates.riskScore;
    }
    if (updates.reason) {
      payload.reason = updates.reason;
    }
    if (updates.description !== undefined) {
      payload.description = updates.description ?? null;
    }
    if (updates.metadata !== undefined) {
      payload.metadata = JSON.stringify(updates.metadata ?? {});
    }
    if (updates.handledBy !== undefined) {
      payload.handled_by = updates.handledBy ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'resolvedAt')) {
      payload.resolved_at = updates.resolvedAt ?? null;
    }

    await connection('scam_reports').where({ id }).update(payload);
    const row = await connection('scam_reports')
      .select({
        id: 'id',
        publicId: 'public_id',
        reporterId: 'reporter_id',
        entityType: 'entity_type',
        entityId: 'entity_id',
        communityId: 'community_id',
        status: 'status',
        riskScore: 'risk_score',
        reason: 'reason',
        description: 'description',
        metadata: 'metadata',
        handledBy: 'handled_by',
        resolvedAt: 'resolved_at',
        createdAt: 'created_at',
        updatedAt: 'updated_at'
      })
      .where({ id })
      .first();
    return mapRow(row);
  }

  static async list(filters = {}, pagination = {}, connection = db) {
    const page = pagination.page && pagination.page > 0 ? pagination.page : 1;
    const perPage = pagination.perPage && pagination.perPage > 0 ? Math.min(pagination.perPage, 100) : 25;

    const query = connection('scam_reports').select({
      id: 'id',
      publicId: 'public_id',
      reporterId: 'reporter_id',
      entityType: 'entity_type',
      entityId: 'entity_id',
      communityId: 'community_id',
      status: 'status',
      riskScore: 'risk_score',
      reason: 'reason',
      description: 'description',
      metadata: 'metadata',
      handledBy: 'handled_by',
      resolvedAt: 'resolved_at',
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    });

    if (filters.status) {
      query.whereIn('status', Array.isArray(filters.status) ? filters.status : [filters.status]);
    }
    if (filters.communityId) {
      query.andWhere('community_id', filters.communityId);
    }
    if (filters.reporterId) {
      query.andWhere('reporter_id', filters.reporterId);
    }
    if (filters.entityType) {
      query.whereIn('entity_type', Array.isArray(filters.entityType) ? filters.entityType : [filters.entityType]);
    }
    if (filters.search) {
      const term = `%${filters.search.toLowerCase()}%`;
      query.where((builder) => {
        builder
          .whereRaw('LOWER(reason) LIKE ?', [term])
          .orWhereRaw('LOWER(description) LIKE ?', [term])
          .orWhereRaw('LOWER(entity_id) LIKE ?', [term]);
      });
    }
    if (filters.from) {
      query.andWhere('created_at', '>=', filters.from);
    }
    if (filters.to) {
      query.andWhere('created_at', '<=', filters.to);
    }

    const totalRow = await query
      .clone()
      .clearSelect()
      .count({ count: '*' })
      .first();

    const rows = await query
      .orderBy('created_at', 'desc')
      .limit(perPage)
      .offset((page - 1) * perPage);

    return {
      items: rows.map((row) => mapRow(row)),
      pagination: {
        page,
        perPage,
        total: Number(totalRow?.count ?? 0),
        pageCount: totalRow?.count ? Math.ceil(Number(totalRow.count) / perPage) : 0
      }
    };
  }
}
