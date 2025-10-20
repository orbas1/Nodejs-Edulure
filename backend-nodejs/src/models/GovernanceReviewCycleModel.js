import { randomUUID } from 'node:crypto';

import db from '../config/database.js';

const TABLE = 'governance_review_cycles';

const BASE_COLUMNS = [
  'id',
  'public_id as publicId',
  'cycle_name as cycleName',
  'status',
  'start_date as startDate',
  'end_date as endDate',
  'next_milestone_at as nextMilestoneAt',
  'focus_areas as focusAreas',
  'participants',
  'action_items as actionItems',
  'outcome_notes as outcomeNotes',
  'readiness_score as readinessScore',
  'created_at as createdAt',
  'updated_at as updatedAt'
];

function parseJson(value, fallback) {
  if (!value) {
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

function serialiseJson(value, fallback) {
  if (value === undefined || value === null) {
    return JSON.stringify(fallback);
  }
  if (typeof value === 'string') {
    return value;
  }
  return JSON.stringify(value);
}

function extractCount(row) {
  if (!row) {
    return 0;
  }
  const value =
    row.count ??
    row['count(*)'] ??
    row['COUNT(*)'] ??
    row['count(`*`)'] ??
    Object.values(row)[0];
  return Number(value ?? 0);
}

function toDbPayload(review) {
  return {
    public_id: review.publicId ?? randomUUID(),
    cycle_name: review.cycleName,
    status: review.status ?? 'planned',
    start_date: review.startDate,
    end_date: review.endDate ?? null,
    next_milestone_at: review.nextMilestoneAt ?? null,
    focus_areas: serialiseJson(review.focusAreas ?? [], []),
    participants: serialiseJson(review.participants ?? [], []),
    action_items: serialiseJson(review.actionItems ?? [], []),
    outcome_notes: review.outcomeNotes ?? null,
    readiness_score: Number.parseInt(review.readinessScore ?? 0, 10) || 0
  };
}

function deserialize(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    publicId: row.publicId,
    cycleName: row.cycleName,
    status: row.status,
    startDate: row.startDate,
    endDate: row.endDate,
    nextMilestoneAt: row.nextMilestoneAt,
    focusAreas: parseJson(row.focusAreas, []),
    participants: parseJson(row.participants, []),
    actionItems: parseJson(row.actionItems, []),
    outcomeNotes: row.outcomeNotes,
    readinessScore: Number.parseInt(row.readinessScore ?? 0, 10) || 0,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export default class GovernanceReviewCycleModel {
  static deserialize = deserialize;

  static async create(review, connection = db) {
    const payload = toDbPayload(review);
    const [id] = await connection(TABLE).insert(payload);
    return this.findById(id, connection);
  }

  static async findById(id, connection = db) {
    const row = await connection(TABLE).select(BASE_COLUMNS).where({ id }).first();
    return row ? deserialize(row) : null;
  }

  static async findByPublicId(publicId, connection = db) {
    const row = await connection(TABLE).select(BASE_COLUMNS).where({ public_id: publicId }).first();
    return row ? deserialize(row) : null;
  }

  static async updateByPublicId(publicId, updates, connection = db) {
    const payload = {};
    if (updates.cycleName !== undefined) {
      payload.cycle_name = updates.cycleName;
    }
    if (updates.status !== undefined) {
      payload.status = updates.status;
    }
    if (updates.startDate !== undefined) {
      payload.start_date = updates.startDate;
    }
    if (updates.endDate !== undefined) {
      payload.end_date = updates.endDate || null;
    }
    if (updates.nextMilestoneAt !== undefined) {
      payload.next_milestone_at = updates.nextMilestoneAt || null;
    }
    if (updates.focusAreas !== undefined) {
      payload.focus_areas = serialiseJson(updates.focusAreas, []);
    }
    if (updates.participants !== undefined) {
      payload.participants = serialiseJson(updates.participants, []);
    }
    if (updates.actionItems !== undefined) {
      payload.action_items = serialiseJson(updates.actionItems, []);
    }
    if (updates.outcomeNotes !== undefined) {
      payload.outcome_notes = updates.outcomeNotes ?? null;
    }
    if (updates.readinessScore !== undefined) {
      payload.readiness_score = Number.parseInt(updates.readinessScore, 10) || 0;
    }

    if (!Object.keys(payload).length) {
      return this.findByPublicId(publicId, connection);
    }

    await connection(TABLE).where({ public_id: publicId }).update({ ...payload, updated_at: connection.fn.now() });
    return this.findByPublicId(publicId, connection);
  }

  static applyFilters(query, filters = {}, connection = db) {
    const builder = query.clone();
    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      builder.whereIn('status', statuses.map((status) => status.trim()).filter(Boolean));
    }
    if (filters.cycleName) {
      builder.whereILike('cycle_name', `%${filters.cycleName}%`);
    }
    if (filters.startAfter) {
      builder.where('start_date', '>=', filters.startAfter);
    }
    if (filters.endBefore) {
      builder.where('end_date', '<=', filters.endBefore);
    }
    if (filters.onlyUpcoming === true) {
      builder.where((qb) => {
        qb.where('status', 'planned')
          .orWhere('status', 'in_progress')
          .orWhere('next_milestone_at', '>=', connection.raw('CURRENT_DATE'));
      });
    }
    if (filters.overdue === true) {
      builder.where((qb) => {
        qb.where('status', 'in_progress').andWhere('next_milestone_at', '<', connection.raw('CURRENT_DATE'));
      });
    }
    return builder;
  }

  static async list(filters = {}, pagination = {}, connection = db) {
    const limit = Math.max(1, Math.min(100, Number.parseInt(pagination.limit ?? '25', 10)));
    const offset = Math.max(0, Number.parseInt(pagination.offset ?? '0', 10));

    const baseQuery = this.applyFilters(
      connection(TABLE).select(BASE_COLUMNS).orderBy('next_milestone_at', 'asc'),
      filters,
      connection
    );
    const rows = await baseQuery.clone().limit(limit).offset(offset);
    const countRow = await this.applyFilters(connection(TABLE).count({ count: '*' }), filters, connection).first();

    return {
      total: extractCount(countRow),
      items: rows.map((row) => deserialize(row))
    };
  }

  static async getScheduleSummary(connection = db) {
    const [totalRow, inProgressRow, overdueRow, completedRow] = await Promise.all([
      connection(TABLE).count({ count: '*' }).first(),
      connection(TABLE).count({ count: '*' }).where({ status: 'in_progress' }).first(),
      connection(TABLE)
        .count({ count: '*' })
        .where({ status: 'in_progress' })
        .andWhere('next_milestone_at', '<', connection.raw('CURRENT_DATE'))
        .first(),
      connection(TABLE).count({ count: '*' }).where({ status: 'completed' }).first()
    ]);

    return {
      totalReviews: extractCount(totalRow),
      activeReviews: extractCount(inProgressRow),
      overdueMilestones: extractCount(overdueRow),
      completedReviews: extractCount(completedRow)
    };
  }
}
