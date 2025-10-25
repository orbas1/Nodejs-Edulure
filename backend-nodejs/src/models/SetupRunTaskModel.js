import db from '../config/database.js';
import { getNowValue, getTable, isMissingTableError, resolveConnection } from './utils/connection.js';

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

    const client = resolveConnection(connection);
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

    try {
      await client.batchInsert(TABLE, payloads, 50);
    } catch (error) {
      if (isMissingTableError(error)) {
        return [];
      }
      throw error;
    }

    return this.listByRunId(runId, client);
  }

  static async listByRunId(runId, connection = db) {
    const client = resolveConnection(connection);

    try {
      const rows = await getTable(client, TABLE)
        .select(BASE_COLUMNS)
        .where({ run_id: runId })
        .orderBy('order_index', 'asc');
      return rows.map(deserialize);
    } catch (error) {
      if (isMissingTableError(error)) {
        return [];
      }
      throw error;
    }
  }

  static async findByRunAndTask(runId, taskId, connection = db) {
    const client = resolveConnection(connection);

    try {
      const row = await getTable(client, TABLE)
        .select(BASE_COLUMNS)
        .where({ run_id: runId, task_id: taskId })
        .first();
      return row ? deserialize(row) : null;
    } catch (error) {
      if (isMissingTableError(error)) {
        return null;
      }
      throw error;
    }
  }

  static async updateByRunAndTask(runId, taskId, updates, connection = db) {
    const client = resolveConnection(connection);
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
      return this.findByRunAndTask(runId, taskId, client);
    }

    try {
      await getTable(client, TABLE)
        .where({ run_id: runId, task_id: taskId })
        .update({ ...payload, updated_at: getNowValue(client) });
    } catch (error) {
      if (isMissingTableError(error)) {
        return this.findByRunAndTask(runId, taskId, client);
      }
      throw error;
    }

    return this.findByRunAndTask(runId, taskId, client);
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
