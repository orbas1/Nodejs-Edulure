import db from '../config/database.js';
import {
  ensureNonEmptyString,
  normaliseOptionalString,
  readJsonColumn,
  writeJsonColumn
} from '../utils/modelUtils.js';

const TABLE = 'background_job_states';

function normaliseKey(value, { fieldName, maxLength = 160 }) {
  const key = ensureNonEmptyString(value, { fieldName, maxLength });
  return key.toLowerCase();
}

function normaliseVersion(value) {
  if (value === undefined || value === null) {
    return null;
  }
  const stringValue = normaliseOptionalString(value, { maxLength: 160 });
  return stringValue;
}

function mapRow(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    jobKey: row.job_key,
    stateKey: row.state_key,
    version: row.version ?? null,
    state: readJsonColumn(row.state_value, {}),
    metadata: readJsonColumn(row.metadata, {}),
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null
  };
}

export default class JobStateModel {
  static table(connection = db) {
    return connection(TABLE);
  }

  static async get(jobKey, stateKey, connection = db) {
    const job = normaliseKey(jobKey, { fieldName: 'jobKey' });
    const key = normaliseKey(stateKey, { fieldName: 'stateKey' });
    const row = await this.table(connection)
      .where({ job_key: job, state_key: key })
      .first();
    return mapRow(row);
  }

  static async save(jobKey, stateKey, { version, state = {}, metadata = {} } = {}, connection = db) {
    const job = normaliseKey(jobKey, { fieldName: 'jobKey' });
    const key = normaliseKey(stateKey, { fieldName: 'stateKey' });
    const payload = {
      job_key: job,
      state_key: key,
      version: normaliseVersion(version),
      state_value: writeJsonColumn(state, {}),
      metadata: writeJsonColumn(metadata, {})
    };

    await this.table(connection)
      .insert({
        ...payload,
        created_at: connection.fn.now(),
        updated_at: connection.fn.now()
      })
      .onConflict(['job_key', 'state_key'])
      .merge({ ...payload, updated_at: connection.fn.now() });

    const row = await this.table(connection)
      .where({ job_key: job, state_key: key })
      .first();
    return mapRow(row);
  }

  static async delete(jobKey, stateKey, connection = db) {
    const job = normaliseKey(jobKey, { fieldName: 'jobKey' });
    const key = normaliseKey(stateKey, { fieldName: 'stateKey' });
    return this.table(connection).where({ job_key: job, state_key: key }).del();
  }
}
