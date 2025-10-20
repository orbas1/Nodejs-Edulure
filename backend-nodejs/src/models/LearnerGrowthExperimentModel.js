import db from '../config/database.js';

const TABLE = 'learner_growth_experiments';

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

function toNumber(value) {
  if (value === null || value === undefined) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function deserialize(row) {
  if (!row) return null;
  return {
    id: row.id,
    initiativeId: row.initiative_id,
    name: row.name,
    status: row.status,
    hypothesis: row.hypothesis ?? null,
    metric: row.metric ?? null,
    baselineValue: toNumber(row.baseline_value),
    targetValue: toNumber(row.target_value),
    resultValue: toNumber(row.result_value),
    startAt: row.start_at,
    endAt: row.end_at,
    segments: parseJson(row.segments, []),
    metadata: parseJson(row.metadata, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export default class LearnerGrowthExperimentModel {
  static deserialize(row) {
    return deserialize(row);
  }

  static async listByInitiativeId(initiativeId, connection = db) {
    if (!initiativeId) return [];
    const rows = await connection(TABLE)
      .select([
        'id',
        'initiative_id',
        'name',
        'status',
        'hypothesis',
        'metric',
        'baseline_value',
        'target_value',
        'result_value',
        'start_at',
        'end_at',
        'segments',
        'metadata',
        'created_at',
        'updated_at'
      ])
      .where({ initiative_id: initiativeId })
      .orderBy('created_at', 'desc');
    return rows.map(deserialize);
  }

  static async findById(id, connection = db) {
    if (!id) return null;
    const row = await connection(TABLE).select('*').where({ id }).first();
    return deserialize(row);
  }

  static async create(experiment, connection = db) {
    const payload = {
      initiative_id: experiment.initiativeId,
      name: experiment.name,
      status: experiment.status ?? 'draft',
      hypothesis: experiment.hypothesis ?? null,
      metric: experiment.metric ?? null,
      baseline_value: experiment.baselineValue ?? null,
      target_value: experiment.targetValue ?? null,
      result_value: experiment.resultValue ?? null,
      start_at: experiment.startAt ?? null,
      end_at: experiment.endAt ?? null,
      segments: JSON.stringify(experiment.segments ?? []),
      metadata: JSON.stringify(experiment.metadata ?? {})
    };
    const [id] = await connection(TABLE).insert(payload);
    return this.findById(id, connection);
  }

  static async updateById(id, updates, connection = db) {
    if (!id) return null;
    const payload = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.hypothesis !== undefined) payload.hypothesis = updates.hypothesis ?? null;
    if (updates.metric !== undefined) payload.metric = updates.metric ?? null;
    if (updates.baselineValue !== undefined) payload.baseline_value = updates.baselineValue ?? null;
    if (updates.targetValue !== undefined) payload.target_value = updates.targetValue ?? null;
    if (updates.resultValue !== undefined) payload.result_value = updates.resultValue ?? null;
    if (updates.startAt !== undefined) payload.start_at = updates.startAt ?? null;
    if (updates.endAt !== undefined) payload.end_at = updates.endAt ?? null;
    if (updates.segments !== undefined) payload.segments = JSON.stringify(updates.segments ?? []);
    if (updates.metadata !== undefined) payload.metadata = JSON.stringify(updates.metadata ?? {});
    if (Object.keys(payload).length) {
      await connection(TABLE).where({ id }).update(payload);
    }
    return this.findById(id, connection);
  }

  static async deleteById(id, connection = db) {
    if (!id) return 0;
    return connection(TABLE).where({ id }).del();
  }
}
