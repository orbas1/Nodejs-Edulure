import { randomUUID } from 'node:crypto';

import db from '../config/database.js';

const TABLE = 'release_gate_results';

const BASE_COLUMNS = [
  'id',
  'public_id as publicId',
  'run_id as runId',
  'checklist_item_id as checklistItemId',
  'gate_key as gateKey',
  'status',
  'owner_email as ownerEmail',
  'metrics',
  'notes',
  'evidence_url as evidenceUrl',
  'last_evaluated_at as lastEvaluatedAt',
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

function deserialize(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    publicId: row.publicId,
    runId: row.runId,
    checklistItemId: row.checklistItemId,
    gateKey: row.gateKey,
    status: row.status,
    ownerEmail: row.ownerEmail,
    metrics: parseJson(row.metrics, {}),
    notes: row.notes,
    evidenceUrl: row.evidenceUrl,
    lastEvaluatedAt: row.lastEvaluatedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function toDbPayload(gate) {
  return {
    public_id: gate.publicId ?? randomUUID(),
    run_id: gate.runId,
    checklist_item_id: gate.checklistItemId ?? null,
    gate_key: gate.gateKey,
    status: gate.status ?? 'pending',
    owner_email: gate.ownerEmail ?? null,
    metrics: serialiseJson(gate.metrics ?? {}, {}),
    notes: gate.notes ?? null,
    evidence_url: gate.evidenceUrl ?? null,
    last_evaluated_at: gate.lastEvaluatedAt ?? null
  };
}

export default class ReleaseGateResultModel {
  static deserialize = deserialize;

  static async create(gate, connection = db) {
    const payload = toDbPayload(gate);
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

  static async findByRunAndGate(runId, gateKey, connection = db) {
    const row = await connection(TABLE).select(BASE_COLUMNS).where({ run_id: runId, gate_key: gateKey }).first();
    return row ? deserialize(row) : null;
  }

  static async upsertByRunAndGate(runId, gateKey, updates, connection = db) {
    const existing = await this.findByRunAndGate(runId, gateKey, connection);
    const payload = toDbPayload({
      ...updates,
      runId,
      gateKey,
      publicId: existing?.publicId,
      checklistItemId: updates.checklistItemId ?? existing?.checklistItemId,
      status: updates.status ?? existing?.status ?? 'pending',
      ownerEmail: updates.ownerEmail ?? existing?.ownerEmail ?? null,
      metrics: updates.metrics ?? existing?.metrics ?? {},
      notes: updates.notes ?? existing?.notes ?? null,
      evidenceUrl: updates.evidenceUrl ?? existing?.evidenceUrl ?? null,
      lastEvaluatedAt: updates.lastEvaluatedAt ?? updates.evaluatedAt ?? existing?.lastEvaluatedAt ?? null
    });

    if (existing) {
      await connection(TABLE)
        .where({ id: existing.id })
        .update({
          checklist_item_id: payload.checklist_item_id,
          status: payload.status,
          owner_email: payload.owner_email,
          metrics: payload.metrics,
          notes: payload.notes,
          evidence_url: payload.evidence_url,
          last_evaluated_at: payload.last_evaluated_at,
          updated_at: connection.fn.now()
        });

      return this.findById(existing.id, connection);
    }

    const [id] = await connection(TABLE).insert(payload);
    return this.findById(id, connection);
  }

  static async listByRunId(runId, connection = db) {
    const rows = await connection(TABLE).select(BASE_COLUMNS).where({ run_id: runId }).orderBy('gate_key', 'asc');
    return rows.map(deserialize);
  }

  static async getStatusSummary(runId, connection = db) {
    const rows = await connection(TABLE)
      .select('status')
      .count({ count: '*' })
      .where({ run_id: runId })
      .groupBy('status');

    const summary = {};
    for (const row of rows) {
      summary[row.status] = Number(row.count ?? row['count(*)'] ?? row['COUNT(*)'] ?? Object.values(row)[0] ?? 0);
    }

    return summary;
  }
}
