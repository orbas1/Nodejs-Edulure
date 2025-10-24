import { createHash } from 'crypto';

import db from '../config/database.js';

const TABLE = 'job_states';

function normaliseJobName(jobName) {
  if (!jobName || typeof jobName !== 'string') {
    throw new Error('Job name must be a non-empty string');
  }
  return jobName.trim().toLowerCase();
}

function parseJson(value, fallback = {}) {
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

function toSerializable(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'bigint') {
    return Number(value);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => toSerializable(entry));
  }

  if (typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((accumulator, key) => {
        const serialised = toSerializable(value[key]);
        if (serialised === undefined) {
          return accumulator;
        }
        accumulator[key] = serialised;
        return accumulator;
      }, {});
  }

  return value;
}

function serialiseState(state) {
  const serialisable = toSerializable(state ?? {});
  return JSON.stringify(serialisable ?? {});
}

function mergeStates(baseState, patchState) {
  const base = baseState && typeof baseState === 'object' ? { ...baseState } : {};
  const patch = patchState && typeof patchState === 'object' ? patchState : {};

  return Object.keys(patch).reduce((accumulator, key) => {
    const patchValue = patch[key];

    if (patchValue === undefined) {
      delete accumulator[key];
      return accumulator;
    }

    const baseValue = accumulator[key];
    const bothObjects =
      patchValue &&
      typeof patchValue === 'object' &&
      !Array.isArray(patchValue) &&
      baseValue &&
      typeof baseValue === 'object' &&
      !Array.isArray(baseValue);

    if (bothObjects) {
      accumulator[key] = mergeStates(baseValue, patchValue);
      return accumulator;
    }

    accumulator[key] = patchValue;
    return accumulator;
  }, { ...base });
}

function computeChecksum(state) {
  const payload = serialiseState(state);
  return createHash('sha256').update(payload).digest('hex');
}

function mapRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    jobName: row.job_name,
    state: parseJson(row.state, {}),
    checksum: row.checksum ?? null,
    lockedAt: row.locked_at ?? null,
    lockedBy: row.locked_by ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null
  };
}

export default class JobStateModel {
  static table(connection = db) {
    return connection(TABLE);
  }

  static async get(jobName, connection = db) {
    const normalised = normaliseJobName(jobName);
    const row = await this.table(connection).where({ job_name: normalised }).first();
    return mapRow(row);
  }

  static async save(jobName, state, connection = db) {
    const normalised = normaliseJobName(jobName);
    const payload = serialiseState(state ?? {});
    const checksum = computeChecksum(state ?? {});

    const existing = await this.table(connection).where({ job_name: normalised }).first();

    if (existing) {
      await this.table(connection)
        .where({ id: existing.id })
        .update({
          state: payload,
          checksum,
          updated_at: connection.fn.now()
        });
    } else {
      await this.table(connection).insert({
        job_name: normalised,
        state: payload,
        checksum,
        created_at: connection.fn.now(),
        updated_at: connection.fn.now()
      });
    }

    return this.get(normalised, connection);
  }

  static async merge(jobName, patch, connection = db) {
    const current = await this.get(jobName, connection);
    const baseState = current?.state ?? {};
    const nextState = mergeStates(baseState, patch ?? {});
    return this.save(jobName, nextState, connection);
  }

  static async update(jobName, updater, connection = db) {
    if (typeof updater !== 'function') {
      throw new Error('JobStateModel.update requires an updater function');
    }

    const current = await this.get(jobName, connection);
    const baseState = current?.state ?? {};
    const nextState = await updater({ ...baseState });

    if (!nextState || typeof nextState !== 'object') {
      throw new Error('JobStateModel.update callback must return an object');
    }

    return this.save(jobName, nextState, connection);
  }
}
