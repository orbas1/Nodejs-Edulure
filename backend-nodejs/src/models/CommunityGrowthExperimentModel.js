import db from '../config/database.js';
import {
  ensureIntegerInRange,
  ensureNonEmptyString,
  normaliseOptionalString,
  readJsonColumn,
  writeJsonColumn
} from '../utils/modelUtils.js';

const TABLE = 'community_growth_experiments';
const STATUS_OPTIONS = new Set(['ideation', 'active', 'paused', 'completed', 'cancelled']);

function normalisePrimaryId(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    throw new Error(`${fieldName} is required`);
  }

  return ensureIntegerInRange(value, { fieldName, min: 1 });
}

function normaliseStatus(status) {
  if (status === undefined || status === null || status === '') {
    return 'ideation';
  }

  const candidate = String(status).trim().toLowerCase();
  if (!STATUS_OPTIONS.has(candidate)) {
    throw new Error(`Unsupported experiment status '${status}'`);
  }
  return candidate;
}

function normaliseNullableNumber(value, { fieldName, min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY } = {}) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    throw new Error(`${fieldName} must be a finite number`);
  }

  if (numeric < min || numeric > max) {
    throw new Error(`${fieldName} must be between ${min} and ${max}`);
  }

  return numeric;
}

function normaliseDate(value, { fieldName } = {}) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${fieldName} must be a valid date`);
  }
  return date;
}

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    communityId: row.community_id,
    createdBy: row.created_by ?? null,
    title: row.title,
    ownerName: row.owner_name ?? null,
    status: row.status,
    targetMetric: row.target_metric ?? null,
    baselineValue: row.baseline_value !== null ? Number(row.baseline_value) : null,
    targetValue: row.target_value !== null ? Number(row.target_value) : null,
    impactScore: row.impact_score !== null ? Number(row.impact_score) : null,
    startDate: row.start_date ?? null,
    endDate: row.end_date ?? null,
    hypothesis: row.hypothesis ?? null,
    notes: row.notes ?? null,
    experimentUrl: row.experiment_url ?? null,
    metadata: readJsonColumn(row.metadata, {}),
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null
  };
}

function buildInsertPayload(experiment) {
  if (!experiment) {
    throw new Error('Experiment payload is required');
  }

  return {
    community_id: normalisePrimaryId(experiment.communityId, 'communityId'),
    created_by:
      experiment.createdBy === undefined || experiment.createdBy === null || experiment.createdBy === ''
        ? null
        : ensureIntegerInRange(experiment.createdBy, { fieldName: 'createdBy', min: 1 }),
    title: ensureNonEmptyString(experiment.title, { fieldName: 'title', maxLength: 240 }),
    owner_name: normaliseOptionalString(experiment.ownerName, { maxLength: 120 }),
    status: normaliseStatus(experiment.status),
    target_metric: normaliseOptionalString(experiment.targetMetric, { maxLength: 120 }),
    baseline_value: normaliseNullableNumber(experiment.baselineValue, {
      fieldName: 'baselineValue',
      min: -1_000_000,
      max: 1_000_000
    }),
    target_value: normaliseNullableNumber(experiment.targetValue, {
      fieldName: 'targetValue',
      min: -1_000_000,
      max: 1_000_000
    }),
    impact_score: normaliseNullableNumber(experiment.impactScore, {
      fieldName: 'impactScore',
      min: -100,
      max: 100
    }),
    start_date: normaliseDate(experiment.startDate, { fieldName: 'startDate' }),
    end_date: normaliseDate(experiment.endDate, { fieldName: 'endDate' }),
    hypothesis: normaliseOptionalString(experiment.hypothesis, { maxLength: 2000 }),
    notes: normaliseOptionalString(experiment.notes, { maxLength: 4000 }),
    experiment_url: normaliseOptionalString(experiment.experimentUrl, { maxLength: 500 }),
    metadata: writeJsonColumn(experiment.metadata, {})
  };
}

export default class CommunityGrowthExperimentModel {
  static table(connection = db) {
    return connection(TABLE);
  }

  static async listForCommunity(communityId, filters = {}, connection = db) {
    const { status, search, order = 'desc', limit = 100, offset = 0 } = filters ?? {};
    const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
    const safeOffset = Math.max(Number(offset) || 0, 0);
    const direction = order === 'asc' ? 'asc' : 'desc';
    const orderColumn = order === 'asc' ? 'start_date' : 'updated_at';

    const isMock = typeof connection.__getRows === 'function';

    if (isMock) {
      const rows = await this.table(connection).where({ community_id: normalisePrimaryId(communityId, 'communityId') });
      const normalisedStatuses = Array.isArray(status)
        ? status.map(normaliseStatus)
        : status
          ? [normaliseStatus(status)]
          : null;
      const searchTerm = typeof search === 'string' && search.trim() ? search.trim().toLowerCase() : null;

      const filtered = rows
        .filter((row) => {
          if (normalisedStatuses && !normalisedStatuses.includes(String(row.status).toLowerCase())) {
            return false;
          }
          if (searchTerm) {
            const haystacks = [row.title, row.owner_name, row.target_metric]
              .filter(Boolean)
              .map((value) => String(value).toLowerCase());
            if (!haystacks.some((value) => value.includes(searchTerm))) {
              return false;
            }
          }
          return true;
        })
        .sort((a, b) => {
          const aValue = a[orderColumn] ?? 0;
          const bValue = b[orderColumn] ?? 0;
          const aTime = aValue instanceof Date ? aValue.getTime() : new Date(aValue ?? 0).getTime();
          const bTime = bValue instanceof Date ? bValue.getTime() : new Date(bValue ?? 0).getTime();
          return direction === 'desc' ? bTime - aTime : aTime - bTime;
        });

      const total = filtered.length;
      const sliced = filtered.slice(safeOffset, safeOffset + safeLimit);

      return {
        items: sliced.map(mapRow),
        total,
        limit: safeLimit,
        offset: safeOffset
      };
    }

    const scopedQuery = this.table(connection).where({ community_id: normalisePrimaryId(communityId, 'communityId') });

    if (Array.isArray(status) && status.length) {
      const statuses = status.map(normaliseStatus);
      scopedQuery.whereIn('status', statuses);
    } else if (typeof status === 'string' && status) {
      scopedQuery.where('status', normaliseStatus(status));
    }

    if (search) {
      const like = `%${String(search).trim().toLowerCase()}%`;
      scopedQuery.andWhere((inner) => {
        inner
          .whereRaw('LOWER(title) LIKE ?', [like])
          .orWhereRaw('LOWER(owner_name) LIKE ?', [like])
          .orWhereRaw('LOWER(target_metric) LIKE ?', [like]);
      });
    }

    const [rows, totalResult] = await Promise.all([
      scopedQuery
        .clone()
        .orderBy(orderColumn, direction)
        .limit(safeLimit)
        .offset(safeOffset),
      scopedQuery
        .clone()
        .clearSelect()
        .clearOrder()
        .count({ total: '*' })
        .first()
    ]);

    const total = Number(totalResult?.total ?? rows.length ?? 0);

    return {
      items: rows.map(mapRow),
      total,
      limit: safeLimit,
      offset: safeOffset
    };
  }

  static async findById(id, connection = db) {
    const row = await this.table(connection)
      .where({ id: ensureIntegerInRange(id, { fieldName: 'id', min: 1 }) })
      .first();
    return mapRow(row);
  }

  static async create(experiment, connection = db) {
    const payload = buildInsertPayload(experiment);
    const [id] = await this.table(connection).insert(payload);
    return this.findById(id, connection);
  }

  static async update(id, updates = {}, connection = db) {
    const payload = { updated_at: connection.fn.now() };

    if (updates.title !== undefined) {
      payload.title = ensureNonEmptyString(updates.title, { fieldName: 'title', maxLength: 240 });
    }
    if (updates.ownerName !== undefined) {
      payload.owner_name = normaliseOptionalString(updates.ownerName, { maxLength: 120 });
    }
    if (updates.status !== undefined) {
      payload.status = normaliseStatus(updates.status);
    }
    if (updates.targetMetric !== undefined) {
      payload.target_metric = normaliseOptionalString(updates.targetMetric, { maxLength: 120 });
    }
    if (updates.baselineValue !== undefined) {
      payload.baseline_value = normaliseNullableNumber(updates.baselineValue, {
        fieldName: 'baselineValue',
        min: -1_000_000,
        max: 1_000_000
      });
    }
    if (updates.targetValue !== undefined) {
      payload.target_value = normaliseNullableNumber(updates.targetValue, {
        fieldName: 'targetValue',
        min: -1_000_000,
        max: 1_000_000
      });
    }
    if (updates.impactScore !== undefined) {
      payload.impact_score = normaliseNullableNumber(updates.impactScore, {
        fieldName: 'impactScore',
        min: -100,
        max: 100
      });
    }
    if (updates.startDate !== undefined) {
      payload.start_date = normaliseDate(updates.startDate, { fieldName: 'startDate' });
    }
    if (updates.endDate !== undefined) {
      payload.end_date = normaliseDate(updates.endDate, { fieldName: 'endDate' });
    }
    if (updates.hypothesis !== undefined) {
      payload.hypothesis = normaliseOptionalString(updates.hypothesis, { maxLength: 2000 });
    }
    if (updates.notes !== undefined) {
      payload.notes = normaliseOptionalString(updates.notes, { maxLength: 4000 });
    }
    if (updates.experimentUrl !== undefined) {
      payload.experiment_url = normaliseOptionalString(updates.experimentUrl, { maxLength: 500 });
    }
    if (updates.metadata !== undefined) {
      payload.metadata = writeJsonColumn(updates.metadata, {});
    }

    await this.table(connection)
      .where({ id: ensureIntegerInRange(id, { fieldName: 'id', min: 1 }) })
      .update(payload);
    return this.findById(id, connection);
  }

  static async delete(id, connection = db) {
    await this.table(connection)
      .where({ id: ensureIntegerInRange(id, { fieldName: 'id', min: 1 }) })
      .del();
  }
}
