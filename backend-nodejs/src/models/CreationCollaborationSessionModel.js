import { randomUUID } from 'node:crypto';

import db from '../config/database.js';

const TABLE = 'creation_collaboration_sessions';

const BASE_COLUMNS = [
  'id',
  'public_id as publicId',
  'project_id as projectId',
  'participant_id as participantId',
  'role',
  'capabilities',
  'metadata',
  'joined_at as joinedAt',
  'last_heartbeat_at as lastHeartbeatAt',
  'left_at as leftAt',
  'was_terminated as wasTerminated'
];

function parseList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}

function parseObject(value) {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_error) {
      return {};
    }
  }
  return value ?? {};
}

export default class CreationCollaborationSessionModel {
  static async create(session, connection = db) {
    const [id] = await connection(TABLE).insert({
      public_id: session.publicId ?? randomUUID(),
      project_id: session.projectId,
      participant_id: session.participantId,
      role: session.role,
      capabilities: JSON.stringify(session.capabilities ?? []),
      metadata: JSON.stringify(session.metadata ?? {}),
      joined_at: session.joinedAt ?? connection.fn.now(),
      last_heartbeat_at: session.lastHeartbeatAt ?? connection.fn.now(),
      left_at: session.leftAt ?? null,
      was_terminated: Boolean(session.wasTerminated)
    });
    return this.findById(id, connection);
  }

  static async findByPublicId(publicId, connection = db) {
    const row = await connection(TABLE).select(BASE_COLUMNS).where({ public_id: publicId }).first();
    return row ? this.deserialize(row) : null;
  }

  static async findActiveByParticipant(projectId, participantId, connection = db) {
    const row = await connection(TABLE)
      .select(BASE_COLUMNS)
      .where({ project_id: projectId, participant_id: participantId })
      .whereNull('left_at')
      .orderBy('joined_at', 'desc')
      .first();
    return row ? this.deserialize(row) : null;
  }

  static async markHeartbeat(sessionId, connection = db) {
    await connection(TABLE)
      .where({ id: sessionId })
      .update({ last_heartbeat_at: connection.fn.now() });
  }

  static async endSession(sessionId, { wasTerminated = false } = {}, connection = db) {
    await connection(TABLE)
      .where({ id: sessionId })
      .update({
        left_at: connection.fn.now(),
        was_terminated: wasTerminated,
        last_heartbeat_at: connection.fn.now()
      });
    return this.findById(sessionId, connection);
  }

  static async findById(id, connection = db) {
    const row = await connection(TABLE).select(BASE_COLUMNS).where({ id }).first();
    return row ? this.deserialize(row) : null;
  }

  static async listActiveByProject(projectId, connection = db) {
    const rows = await connection(TABLE)
      .select(BASE_COLUMNS)
      .where({ project_id: projectId })
      .whereNull('left_at')
      .orderBy('joined_at', 'desc');
    return rows.map((row) => this.deserialize(row));
  }

  static deserialize(record) {
    return {
      ...record,
      capabilities: parseList(record.capabilities),
      metadata: parseObject(record.metadata)
    };
  }
}

