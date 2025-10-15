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
    communityId: row.communityId,
    postId: row.postId,
    reporterId: row.reporterId ?? undefined,
    assignedTo: row.assignedTo ?? undefined,
    status: row.status,
    severity: row.severity,
    flaggedSource: row.flaggedSource,
    reason: row.reason,
    riskScore: typeof row.riskScore === 'number' ? row.riskScore : Number(row.riskScore ?? 0),
    metadata: parseJson(row.metadata, {}),
    escalatedAt: row.escalatedAt ?? undefined,
    resolvedAt: row.resolvedAt ?? undefined,
    resolvedBy: row.resolvedBy ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    post: row.postId
      ? {
          id: row.postId,
          title: row.postTitle ?? undefined,
          status: row.postStatus,
          moderationState: row.postModerationState,
          authorId: row.postAuthorId ?? undefined
        }
      : undefined,
    reporter: row.reporterId
      ? {
          id: row.reporterId,
          name: row.reporterName ?? undefined,
          email: row.reporterEmail ?? undefined
        }
      : undefined,
    assignee: row.assignedTo
      ? {
          id: row.assignedTo,
          name: row.assignedName ?? undefined,
          email: row.assignedEmail ?? undefined
        }
      : undefined,
    resolvedByUser: row.resolvedBy
      ? {
          id: row.resolvedBy,
          name: row.resolvedName ?? undefined,
          email: row.resolvedEmail ?? undefined
        }
      : undefined
  };
}

export default class CommunityPostModerationCaseModel {
  static async create(casePayload, connection = db) {
    const payload = {
      public_id: casePayload.publicId ?? crypto.randomUUID(),
      community_id: casePayload.communityId,
      post_id: casePayload.postId,
      reporter_id: casePayload.reporterId ?? null,
      assigned_to: casePayload.assignedTo ?? null,
      status: casePayload.status ?? 'pending',
      severity: casePayload.severity ?? 'low',
      flagged_source: casePayload.flaggedSource ?? 'user_report',
      reason: casePayload.reason,
      risk_score: casePayload.riskScore ?? 0,
      metadata: JSON.stringify(casePayload.metadata ?? {}),
      escalated_at: casePayload.escalatedAt ?? null,
      resolved_at: casePayload.resolvedAt ?? null,
      resolved_by: casePayload.resolvedBy ?? null
    };

    const [id] = await connection('community_post_moderation_cases').insert(payload);
    const row = await connection('community_post_moderation_cases as cpmc')
      .leftJoin('community_posts as cp', 'cpmc.post_id', 'cp.id')
      .leftJoin('users as reporter', 'cpmc.reporter_id', 'reporter.id')
      .leftJoin('users as assignee', 'cpmc.assigned_to', 'assignee.id')
      .leftJoin('users as resolver', 'cpmc.resolved_by', 'resolver.id')
      .select(this.columns(connection))
      .where('cpmc.id', id)
      .first();

    return mapRow(row);
  }

  static async findByPublicId(publicId, connection = db) {
    const row = await connection('community_post_moderation_cases as cpmc')
      .leftJoin('community_posts as cp', 'cpmc.post_id', 'cp.id')
      .leftJoin('users as reporter', 'cpmc.reporter_id', 'reporter.id')
      .leftJoin('users as assignee', 'cpmc.assigned_to', 'assignee.id')
      .leftJoin('users as resolver', 'cpmc.resolved_by', 'resolver.id')
      .select(this.columns(connection))
      .where('cpmc.public_id', publicId)
      .first();
    return mapRow(row);
  }

  static async findOpenByPost(postId, connection = db) {
    const row = await connection('community_post_moderation_cases')
      .where({ post_id: postId })
      .whereNull('resolved_at')
      .whereIn('status', ['pending', 'in_review', 'escalated'])
      .orderBy('created_at', 'desc')
      .first();
    return row ? mapRow(row) : null;
  }

  static async updateById(id, updates, connection = db) {
    const payload = {
      updated_at: connection.fn.now()
    };

    if (updates.status) {
      payload.status = updates.status;
    }
    if (updates.severity) {
      payload.severity = updates.severity;
    }
    if (updates.flaggedSource) {
      payload.flagged_source = updates.flaggedSource;
    }
    if (updates.reason) {
      payload.reason = updates.reason;
    }
    if (updates.riskScore !== undefined) {
      payload.risk_score = updates.riskScore;
    }
    if (updates.metadata !== undefined) {
      payload.metadata = JSON.stringify(updates.metadata ?? {});
    }
    if (updates.assignedTo !== undefined) {
      payload.assigned_to = updates.assignedTo ?? null;
    }
    if (updates.reporterId !== undefined) {
      payload.reporter_id = updates.reporterId ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'escalatedAt')) {
      payload.escalated_at = updates.escalatedAt ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'resolvedAt')) {
      payload.resolved_at = updates.resolvedAt ?? null;
    }
    if (updates.resolvedBy !== undefined) {
      payload.resolved_by = updates.resolvedBy ?? null;
    }

    await connection('community_post_moderation_cases').where({ id }).update(payload);
    const row = await connection('community_post_moderation_cases as cpmc')
      .leftJoin('community_posts as cp', 'cpmc.post_id', 'cp.id')
      .leftJoin('users as reporter', 'cpmc.reporter_id', 'reporter.id')
      .leftJoin('users as assignee', 'cpmc.assigned_to', 'assignee.id')
      .leftJoin('users as resolver', 'cpmc.resolved_by', 'resolver.id')
      .select(this.columns(connection))
      .where('cpmc.id', id)
      .first();
    return mapRow(row);
  }

  static async list(filters = {}, pagination = {}, connection = db) {
    const page = pagination.page && pagination.page > 0 ? pagination.page : 1;
    const perPage = pagination.perPage && pagination.perPage > 0 ? Math.min(pagination.perPage, 100) : 20;

    const query = connection('community_post_moderation_cases as cpmc')
      .leftJoin('community_posts as cp', 'cpmc.post_id', 'cp.id')
      .leftJoin('users as reporter', 'cpmc.reporter_id', 'reporter.id')
      .leftJoin('users as assignee', 'cpmc.assigned_to', 'assignee.id')
      .leftJoin('users as resolver', 'cpmc.resolved_by', 'resolver.id')
      .select(this.columns(connection));

    if (filters.communityId) {
      query.where('cpmc.community_id', filters.communityId);
    }
    if (filters.status) {
      query.whereIn('cpmc.status', Array.isArray(filters.status) ? filters.status : [filters.status]);
    }
    if (filters.severity) {
      query.whereIn('cpmc.severity', Array.isArray(filters.severity) ? filters.severity : [filters.severity]);
    }
    if (filters.flaggedSource) {
      query.whereIn(
        'cpmc.flagged_source',
        Array.isArray(filters.flaggedSource) ? filters.flaggedSource : [filters.flaggedSource]
      );
    }
    if (filters.search) {
      const term = `%${filters.search.toLowerCase()}%`;
      query.where((builder) => {
        builder
          .whereRaw('LOWER(cpmc.reason) LIKE ?', [term])
          .orWhereRaw('LOWER(cp.title) LIKE ?', [term]);
      });
    }
    if (filters.from) {
      query.where('cpmc.created_at', '>=', filters.from);
    }
    if (filters.to) {
      query.where('cpmc.created_at', '<=', filters.to);
    }

    const totalRow = await query
      .clone()
      .clearSelect()
      .count({ count: '*' })
      .first();

    const rows = await query
      .orderBy('cpmc.created_at', 'desc')
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

  static async countOpenBySeverity(filters = {}, connection = db) {
    const query = connection('community_post_moderation_cases')
      .select('severity')
      .count({ total: '*' })
      .whereNull('resolved_at')
      .whereIn('status', ['pending', 'in_review', 'escalated']);

    if (filters.communityId) {
      query.andWhere('community_id', filters.communityId);
    }

    const rows = await query.groupBy('severity');
    const result = { low: 0, medium: 0, high: 0, critical: 0 };
    for (const row of rows) {
      result[row.severity] = Number(row.total ?? 0);
    }
    return result;
  }

  static async resolutionStats(filters = {}, connection = db) {
    const query = connection('community_post_moderation_cases')
      .whereNotNull('resolved_at')
      .whereIn('status', ['approved', 'rejected', 'suppressed']);

    if (filters.communityId) {
      query.andWhere('community_id', filters.communityId);
    }
    if (filters.from) {
      query.andWhere('resolved_at', '>=', filters.from);
    }
    if (filters.to) {
      query.andWhere('resolved_at', '<=', filters.to);
    }

    const rows = await query
      .select(
        connection.raw('AVG(TIMESTAMPDIFF(MINUTE, created_at, resolved_at)) as avg_minutes'),
        connection.raw('MAX(TIMESTAMPDIFF(MINUTE, created_at, resolved_at)) as max_minutes')
      )
      .first();

    const averageMinutes = rows?.avg_minutes ? Number(rows.avg_minutes) : 0;
    const maxMinutes = rows?.max_minutes ? Number(rows.max_minutes) : 0;

    return {
      averageMinutes,
      maxMinutes
    };
  }

  static columns(connection = db) {
    return [
      'cpmc.id',
      'cpmc.public_id as publicId',
      'cpmc.community_id as communityId',
      'cpmc.post_id as postId',
      'cpmc.reporter_id as reporterId',
      'cpmc.assigned_to as assignedTo',
      'cpmc.status',
      'cpmc.severity',
      'cpmc.flagged_source as flaggedSource',
      'cpmc.reason',
      'cpmc.risk_score as riskScore',
      'cpmc.metadata',
      'cpmc.escalated_at as escalatedAt',
      'cpmc.resolved_at as resolvedAt',
      'cpmc.resolved_by as resolvedBy',
      'cpmc.created_at as createdAt',
      'cpmc.updated_at as updatedAt',
      'cp.status as postStatus',
      'cp.moderation_state as postModerationState',
      'cp.title as postTitle',
      'cp.author_id as postAuthorId',
      'reporter.email as reporterEmail',
      connection.raw("CONCAT(reporter.first_name, ' ', COALESCE(reporter.last_name, '')) as reporterName"),
      'assignee.email as assignedEmail',
      connection.raw("CONCAT(assignee.first_name, ' ', COALESCE(assignee.last_name, '')) as assignedName"),
      'resolver.email as resolvedEmail',
      connection.raw("CONCAT(resolver.first_name, ' ', COALESCE(resolver.last_name, '')) as resolvedName")
    ];
  }
}
