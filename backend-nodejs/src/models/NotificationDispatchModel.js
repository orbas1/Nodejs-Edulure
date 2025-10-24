import db from '../config/database.js';
import {
  ensureIntegerInRange,
  ensureNonEmptyString,
  normaliseOptionalString,
  readJsonColumn,
  writeJsonColumn
} from '../utils/modelUtils.js';

const TABLE = 'notification_dispatch_queue';
const CHANNELS = new Set(['email', 'push', 'in_app']);
const STATUSES = new Set(['pending', 'processing', 'sent', 'failed', 'cancelled']);

function normaliseChannel(value) {
  const channel = ensureNonEmptyString(value, { fieldName: 'channel', maxLength: 32 }).toLowerCase();
  if (!CHANNELS.has(channel)) {
    throw new Error(`Unsupported notification channel '${value}'`);
  }
  return channel;
}

function normaliseStatus(value) {
  if (value === undefined || value === null || value === '') {
    return 'pending';
  }
  const status = String(value).trim().toLowerCase();
  if (!STATUSES.has(status)) {
    throw new Error(`Unsupported notification status '${value}'`);
  }
  return status;
}

function normaliseDedupeKey(value) {
  return ensureNonEmptyString(value, { fieldName: 'dedupeKey', maxLength: 190 });
}

function mapRow(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    userId: row.user_id ?? null,
    channel: row.channel,
    status: row.status,
    dedupeKey: row.dedupe_key,
    templateId: row.template_id ?? null,
    title: row.title ?? null,
    body: row.body ?? null,
    payload: readJsonColumn(row.payload, {}),
    metadata: readJsonColumn(row.metadata, {}),
    scheduledAt: row.scheduled_at ?? null,
    availableAt: row.available_at ?? null,
    lastAttemptAt: row.last_attempt_at ?? null,
    attempts: Number(row.attempts ?? 0),
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null
  };
}

export default class NotificationDispatchModel {
  static table(connection = db) {
    return connection(TABLE);
  }

  static async enqueue(
    {
      userId,
      channel,
      dedupeKey,
      status = 'pending',
      templateId,
      title,
      body,
      payload = {},
      metadata = {},
      scheduledAt,
      availableAt
    },
    connection = db
  ) {
    const payloadRow = {
      user_id: userId ? ensureIntegerInRange(userId, { fieldName: 'userId', min: 1 }) : null,
      channel: normaliseChannel(channel),
      status: normaliseStatus(status),
      dedupe_key: normaliseDedupeKey(dedupeKey),
      template_id: normaliseOptionalString(templateId, { maxLength: 150 }),
      title: normaliseOptionalString(title, { maxLength: 240 }),
      body: body === undefined || body === null ? null : String(body),
      payload: writeJsonColumn(payload, {}),
      metadata: writeJsonColumn(metadata, {}),
      scheduled_at: scheduledAt ? new Date(scheduledAt) : connection.fn.now(),
      available_at: availableAt ? new Date(availableAt) : connection.fn.now()
    };

    await this.table(connection)
      .insert({
        ...payloadRow,
        attempts: 0,
        created_at: connection.fn.now(),
        updated_at: connection.fn.now()
      })
      .onConflict('dedupe_key')
      .ignore();

    const row = await this.findByDedupeKey(dedupeKey, connection);
    return row;
  }

  static async findByDedupeKey(dedupeKey, connection = db) {
    const key = normaliseDedupeKey(dedupeKey);
    const row = await this.table(connection).where({ dedupe_key: key }).first();
    return mapRow(row);
  }

  static async markStatus(id, { status, attempts, lastAttemptAt, metadata }, connection = db) {
    const updates = {};
    if (status !== undefined) {
      updates.status = normaliseStatus(status);
    }
    if (attempts !== undefined) {
      updates.attempts = ensureIntegerInRange(attempts, { fieldName: 'attempts', min: 0 });
    }
    if (lastAttemptAt !== undefined) {
      updates.last_attempt_at = lastAttemptAt ? new Date(lastAttemptAt) : null;
    }
    if (metadata !== undefined) {
      updates.metadata = writeJsonColumn(metadata, {});
    }
    if (Object.keys(updates).length === 0) {
      return this.findById(id, connection);
    }
    updates.updated_at = connection.fn.now();
    await this.table(connection).where({ id: ensureIntegerInRange(id, { fieldName: 'id', min: 1 }) }).update(updates);
    return this.findById(id, connection);
  }

  static async findById(id, connection = db) {
    const row = await this.table(connection)
      .where({ id: ensureIntegerInRange(id, { fieldName: 'id', min: 1 }) })
      .first();
    return mapRow(row);
  }
}
