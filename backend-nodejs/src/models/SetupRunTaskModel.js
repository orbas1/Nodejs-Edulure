import db from '../config/database.js';

const TABLE = 'setup_run_tasks';

const BASE_COLUMNS = [
  'id',
  'run_id as runId',
  'task_id as taskId',
  'label',
  'order_index as orderIndex',
  'status',
  'logs',
  'error',
  'started_at as startedAt',
  'completed_at as completedAt',
  'created_at as createdAt',
  'updated_at as updatedAt'
];

function parseJson(value, fallback) {
  if (!value) {
    return fallback;
  }

  if (Array.isArray(fallback) && typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (_error) {
      return fallback;
    }
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

function deserialize(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    runId: row.runId,
    taskId: row.taskId,
    label: row.label,
    orderIndex: row.orderIndex,
    status: row.status,
    logs: parseJson(row.logs, []),
    error: parseJson(row.error, {}),
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function toDbPayload(task) {
  return {
    run_id: task.runId,
    task_id: task.taskId,
    label: task.label,
    order_index: task.orderIndex ?? 0,
    status: task.status ?? 'pending',
    logs: serialiseJson(task.logs ?? [], []),
    error: serialiseJson(task.error ?? {}, {}),
    started_at: task.startedAt ?? null,
    completed_at: task.completedAt ?? null
  };
}

export default class SetupRunTaskModel {
  static deserialize = deserialize;

  static async createMany(runId, tasks, connection = db) {
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return [];
    }

    const payloads = tasks.map((task, index) =>
      toDbPayload({
        runId,
        taskId: task.taskId,
        label: task.label,
        orderIndex: task.orderIndex ?? index,
        status: task.status ?? 'pending',
        logs: task.logs ?? [],
        error: task.error ?? {},
        startedAt: task.startedAt ?? null,
        completedAt: task.completedAt ?? null
      })
    );

    await connection.batchInsert(TABLE, payloads, 50);
    return this.listByRunId(runId, connection);
  }

  static async listByRunId(runId, connection = db) {
    const rows = await connection(TABLE)
      .select(BASE_COLUMNS)
      .where({ run_id: runId })
      .orderBy('order_index', 'asc');
    return rows.map(deserialize);
  }

  static async findByRunAndTask(runId, taskId, connection = db) {
    const row = await connection(TABLE).select(BASE_COLUMNS).where({ run_id: runId, task_id: taskId }).first();
    return row ? deserialize(row) : null;
  }

  static async updateByRunAndTask(runId, taskId, updates, connection = db) {
    const payload = {};
    if (updates.status !== undefined) {
      payload.status = updates.status;
    }
    if (updates.label !== undefined) {
      payload.label = updates.label;
    }
    if (updates.orderIndex !== undefined) {
      payload.order_index = updates.orderIndex;
    }
    if (updates.startedAt !== undefined) {
      payload.started_at = updates.startedAt ?? null;
    }
    if (updates.completedAt !== undefined) {
      payload.completed_at = updates.completedAt ?? null;
    }
    if (updates.logs !== undefined) {
      payload.logs = serialiseJson(updates.logs ?? [], []);
    }
    if (updates.error !== undefined) {
      payload.error = serialiseJson(updates.error ?? {}, {});
    }

    if (!Object.keys(payload).length) {
      return this.findByRunAndTask(runId, taskId, connection);
    }

    await connection(TABLE)
      .where({ run_id: runId, task_id: taskId })
      .update({ ...payload, updated_at: connection.fn.now() });

    return this.findByRunAndTask(runId, taskId, connection);
  }

  static async appendLog(runId, taskId, message, connection = db) {
    if (!message) {
      return this.findByRunAndTask(runId, taskId, connection);
    }

    const record = await this.findByRunAndTask(runId, taskId, connection);
    const nextLogs = [...(record?.logs ?? []), message];
    return this.updateByRunAndTask(runId, taskId, { logs: nextLogs }, connection);
  }
}
