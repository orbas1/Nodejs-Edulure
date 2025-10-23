import db from '../config/database.js';

const TABLE = 'creation_project_checklist_items';

const STATUS_VALUES = new Set(['pending', 'in_progress', 'blocked', 'completed']);
const SEVERITY_VALUES = new Set(['info', 'warning', 'critical']);

function parseJson(value, fallback) {
  if (!value && value !== 0) {
    return structuredClone(fallback);
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    } catch (_error) {
      return structuredClone(fallback);
    }
  }

  if (Array.isArray(fallback)) {
    return Array.isArray(value) ? value : structuredClone(fallback);
  }

  if (typeof value === 'object') {
    return { ...fallback, ...value };
  }

  return structuredClone(fallback);
}

export function normaliseStatus(value) {
  if (!value) {
    return 'pending';
  }
  const normalised = String(value).toLowerCase();
  return STATUS_VALUES.has(normalised) ? normalised : 'pending';
}

export function normaliseSeverity(value) {
  if (!value) {
    return 'info';
  }
  const normalised = String(value).toLowerCase();
  return SEVERITY_VALUES.has(normalised) ? normalised : 'info';
}

export default class CreationProjectChecklistItemModel {
  static deserialize(row) {
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      projectId: row.project_id ?? row.projectId,
      taskKey: row.task_key ?? row.taskKey,
      title: row.title,
      description: row.description ?? null,
      category: row.category,
      status: normaliseStatus(row.status),
      severity: normaliseSeverity(row.severity),
      sequenceIndex: Number(row.sequence_index ?? row.sequenceIndex ?? 0),
      dueAt: row.due_at ?? row.dueAt ?? null,
      completedAt: row.completed_at ?? row.completedAt ?? null,
      metadata: parseJson(row.metadata, {}),
      createdAt: row.created_at ?? row.createdAt ?? null,
      updatedAt: row.updated_at ?? row.updatedAt ?? null
    };
  }

  static toPersistence(entity) {
    return {
      project_id: entity.projectId,
      task_key: entity.taskKey,
      title: entity.title,
      description: entity.description ?? null,
      category: entity.category ?? 'setup',
      status: normaliseStatus(entity.status),
      severity: normaliseSeverity(entity.severity),
      sequence_index: Number(entity.sequenceIndex ?? 0),
      due_at: entity.dueAt ?? null,
      completed_at: entity.completedAt ?? null,
      metadata: JSON.stringify(entity.metadata ?? {}),
      created_at: entity.createdAt ?? null,
      updated_at: entity.updatedAt ?? null
    };
  }

  static async findById(id, connection = db) {
    const row = await connection(TABLE).where({ id }).first();
    return this.deserialize(row);
  }

  static async listByProject(projectId, { includeCompleted = true } = {}, connection = db) {
    const query = connection(TABLE)
      .where({ project_id: projectId })
      .orderBy([{ column: 'sequence_index', order: 'asc' }, { column: 'id', order: 'asc' }]);

    if (!includeCompleted) {
      query.whereNot('status', 'completed');
    }

    const rows = await query;
    return rows.map((row) => this.deserialize(row));
  }

  static async summaryForProjects(projectIds, connection = db) {
    if (!projectIds || projectIds.length === 0) {
      return new Map();
    }

    const rows = await connection(TABLE)
      .select(
        'project_id as projectId',
        connection.raw('COUNT(*) as total'),
        connection.raw("SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed"),
        connection.raw(
          "SUM(CASE WHEN status IN ('pending', 'in_progress') AND due_at IS NOT NULL AND due_at < UTC_TIMESTAMP() THEN 1 ELSE 0 END) as overdue"
        ),
        connection.raw("SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical"),
        connection.raw("SUM(CASE WHEN severity = 'warning' THEN 1 ELSE 0 END) as warnings"),
        connection.raw(
          "SUM(CASE WHEN status IN ('pending', 'in_progress') AND severity = 'critical' THEN 1 ELSE 0 END) as blocked"
        )
      )
      .whereIn('project_id', projectIds)
      .groupBy('project_id');

    return this.mapSummaryRows(rows);
  }

  static mapSummaryRows(rows = []) {
    const summary = new Map();
    for (const row of rows) {
      const projectId = Number(row.projectId ?? row.project_id);
      summary.set(projectId, {
        total: Number(row.total ?? 0),
        completed: Number(row.completed ?? 0),
        overdue: Number(row.overdue ?? 0),
        critical: Number(row.critical ?? 0),
        warnings: Number(row.warnings ?? 0),
        blocked: Number(row.blocked ?? 0)
      });
    }
    return summary;
  }

  static async updateById(id, updates, connection = db) {
    const payload = {};

    if (updates.status !== undefined) {
      payload.status = normaliseStatus(updates.status);
    }

    if (updates.severity !== undefined) {
      payload.severity = normaliseSeverity(updates.severity);
    }

    if (updates.title !== undefined) {
      payload.title = updates.title;
    }

    if (updates.description !== undefined) {
      payload.description = updates.description;
    }

    if (updates.category !== undefined) {
      payload.category = updates.category;
    }

    if (updates.sequenceIndex !== undefined) {
      payload.sequence_index = Number(updates.sequenceIndex);
    }

    if (updates.dueAt !== undefined) {
      payload.due_at = updates.dueAt;
    }

    if (updates.completedAt !== undefined) {
      payload.completed_at = updates.completedAt;
    }

    if (updates.metadata !== undefined) {
      payload.metadata = JSON.stringify(updates.metadata ?? {});
    }

    if (Object.keys(payload).length === 0) {
      return this.findById(id, connection);
    }

    await connection(TABLE)
      .where({ id })
      .update({ ...payload, updated_at: connection.fn.now() });

    return this.findById(id, connection);
  }
}
