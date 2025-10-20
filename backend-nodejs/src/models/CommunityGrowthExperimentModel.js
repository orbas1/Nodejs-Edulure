import db from '../config/database.js';

function parseJson(value, fallback = {}) {
  if (!value) return { ...fallback };
  if (typeof value === 'object') return { ...fallback, ...value };
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === 'object' && parsed !== null ? { ...fallback, ...parsed } : { ...fallback };
  } catch (_error) {
    return { ...fallback };
  }
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
    metadata: parseJson(row.metadata, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export default class CommunityGrowthExperimentModel {
  static table(connection = db) {
    return connection('community_growth_experiments');
  }

  static async listForCommunity(communityId, filters = {}, connection = db) {
    const { status, search, order = 'desc', limit = 100, offset = 0 } = filters;
    const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
    const safeOffset = Math.max(Number(offset) || 0, 0);
    const direction = order === 'asc' ? 'asc' : 'desc';
    const orderColumn = order === 'asc' ? 'start_date' : 'updated_at';

    const scopedQuery = this.table(connection)
      .where({ community_id: communityId })
      .modify((qb) => {
        if (Array.isArray(status) && status.length) {
          qb.whereIn('status', status);
        } else if (typeof status === 'string' && status) {
          qb.where('status', status);
        }
        if (search) {
          const like = `%${search.toLowerCase()}%`;
          qb.andWhere((inner) => {
            inner
              .whereRaw('LOWER(title) LIKE ?', [like])
              .orWhereRaw('LOWER(owner_name) LIKE ?', [like])
              .orWhereRaw('LOWER(target_metric) LIKE ?', [like]);
          });
        }
      });

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
    const row = await this.table(connection).where({ id }).first();
    return mapRow(row);
  }

  static async create(experiment, connection = db) {
    const payload = {
      community_id: experiment.communityId,
      created_by: experiment.createdBy ?? null,
      title: experiment.title,
      owner_name: experiment.ownerName ?? null,
      status: experiment.status ?? 'ideation',
      target_metric: experiment.targetMetric ?? null,
      baseline_value: experiment.baselineValue ?? null,
      target_value: experiment.targetValue ?? null,
      impact_score: experiment.impactScore ?? null,
      start_date: experiment.startDate ?? null,
      end_date: experiment.endDate ?? null,
      hypothesis: experiment.hypothesis ?? null,
      notes: experiment.notes ?? null,
      experiment_url: experiment.experimentUrl ?? null,
      metadata: JSON.stringify(experiment.metadata ?? {})
    };

    const [id] = await this.table(connection).insert(payload);
    return this.findById(id, connection);
  }

  static async update(id, updates = {}, connection = db) {
    const payload = { updated_at: connection.fn.now() };

    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.ownerName !== undefined) payload.owner_name = updates.ownerName;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.targetMetric !== undefined) payload.target_metric = updates.targetMetric;
    if (updates.baselineValue !== undefined) payload.baseline_value = updates.baselineValue;
    if (updates.targetValue !== undefined) payload.target_value = updates.targetValue;
    if (updates.impactScore !== undefined) payload.impact_score = updates.impactScore;
    if (updates.startDate !== undefined) payload.start_date = updates.startDate;
    if (updates.endDate !== undefined) payload.end_date = updates.endDate;
    if (updates.hypothesis !== undefined) payload.hypothesis = updates.hypothesis;
    if (updates.notes !== undefined) payload.notes = updates.notes;
    if (updates.experimentUrl !== undefined) payload.experiment_url = updates.experimentUrl;
    if (updates.metadata !== undefined) payload.metadata = JSON.stringify(updates.metadata ?? {});

    await this.table(connection).where({ id }).update(payload);
    return this.findById(id, connection);
  }

  static async delete(id, connection = db) {
    await this.table(connection).where({ id }).del();
  }
}
