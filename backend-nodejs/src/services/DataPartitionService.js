import { createHash, randomUUID } from 'crypto';
import { PassThrough, Transform } from 'stream';
import { pipeline } from 'stream/promises';

import db from '../config/database.js';
import { env } from '../config/env.js';
import logger from '../config/logger.js';
import storageService from './StorageService.js';

function safeJsonParse(value) {
  if (!value) {
    return {};
  }

  if (typeof value === 'object') {
    return value;
  }

  const source = String(value);
  try {
    return JSON.parse(source);
  } catch (error) {
    logger.warn({ err: error, raw: value }, 'Failed to parse partition policy metadata');
    return {};
  }
}

function normalizeArchivePrefix(prefix, fallback = '') {
  const source = (prefix ?? fallback ?? '').trim();
  if (!source) {
    return fallback ?? '';
  }
  return source.replace(/^\/+/, '').replace(/\/+$/, '');
}

function quoteIdentifier(identifier) {
  const value = String(identifier ?? '').trim();
  if (!value) {
    throw new Error('Identifier cannot be empty');
  }
  return `\`${value.replace(/`/g, '``')}\``;
}

function decodePartitionLabel(partitionName) {
  if (!partitionName || partitionName === 'pmax') {
    return null;
  }

  const match = /^p(\d{4})(\d{2})$/.exec(partitionName);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  if (Number.isNaN(year) || Number.isNaN(monthIndex)) {
    return null;
  }

  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 1));
  return {
    name: partitionName,
    start,
    end,
    lessThan: end.toISOString().slice(0, 10)
  };
}

function buildMonthlyPartitionDescriptor(date) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
  const label = `p${start.getUTCFullYear()}${String(start.getUTCMonth() + 1).padStart(2, '0')}`;
  return {
    name: label,
    start,
    end,
    lessThan: end.toISOString().slice(0, 10)
  };
}

function createRepositories(knex, schema) {
  return {
    async fetchPolicies() {
      const rows = await knex('data_partition_policies');
      return rows.map((row) => ({
        id: row.id,
        tableName: row.table_name,
        dateColumn: row.date_column,
        strategy: row.strategy,
        retentionDays: Number(row.retention_days ?? 0),
        metadata: safeJsonParse(row.metadata)
      }));
    },
    async fetchPartitions(tableName) {
      const [rows] = await knex.raw(
        `SELECT PARTITION_NAME AS name, FROM_DAYS(PARTITION_DESCRIPTION) AS less_than
         FROM INFORMATION_SCHEMA.PARTITIONS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
         ORDER BY PARTITION_ORDINAL_POSITION`,
        [schema, tableName]
      );

      return rows
        .filter((row) => row.name)
        .map((row) => decodePartitionLabel(row.name) ?? { name: row.name, start: null, end: null, lessThan: row.less_than });
    },
    async addPartition(tableName, descriptor) {
      const sql = `ALTER TABLE ${quoteIdentifier(tableName)} ADD PARTITION (PARTITION ${descriptor.name} VALUES LESS THAN (TO_DAYS(?)))`;
      try {
        await knex.raw(sql, [descriptor.lessThan]);
      } catch (error) {
        if (error?.code === 'ER_SAME_NAME_PARTITION') {
          return { skipped: true };
        }
        throw error;
      }
      return { created: true };
    },
    async dropPartition(tableName, partitionName) {
      const sql = `ALTER TABLE ${quoteIdentifier(tableName)} DROP PARTITION ${partitionName}`;
      try {
        await knex.raw(sql);
      } catch (error) {
        if (error?.code === 'ER_DROP_PARTITION_NON_EXISTENT') {
          return { skipped: true };
        }
        throw error;
      }
      return { dropped: true };
    },
    async findArchive(tableName, partitionName) {
      return knex('data_partition_archives').where({ table_name: tableName, partition_name: partitionName }).first();
    },
    async recordArchive(entry) {
      const insertPayload = { ...entry, metadata: JSON.stringify(entry.metadata ?? {}) };
      const [id] = await knex('data_partition_archives').insert(insertPayload);
      return { id };
    },
    async markArchiveDropped(id) {
      await knex('data_partition_archives').where({ id }).update({ dropped_at: knex.fn.now() });
    },
    streamPartitionRows({ tableName, dateColumn, start, end }) {
      return knex(tableName)
        .select('*')
        .where(dateColumn, '>=', start)
        .andWhere(dateColumn, '<', end)
        .orderBy(dateColumn, 'asc')
        .stream();
    }
  };
}

export class DataPartitionService {
  constructor({
    knex = db,
    storage = storageService,
    config = env.partitioning,
    repositories,
    loggerInstance = logger.child({ module: 'data-partition-service' }),
    clock = () => new Date()
  } = {}) {
    if (!storage || typeof storage.uploadStream !== 'function') {
      throw new Error('DataPartitionService requires a storage service exposing uploadStream()');
    }

    this.knex = knex;
    this.storage = storage;
    this.config = config ?? {};
    this.logger = loggerInstance;
    this.clock = clock;
    this.repositories = repositories ?? createRepositories(knex, this.config.schema ?? env.database.name);
    this.enabled = Boolean(this.config.enabled);
  }

  async listArchives({ tableName, limit = 25, includeDropped = false } = {}) {
    const rows = await this.knex('data_partition_archives')
      .select(
        'id',
        'table_name as tableName',
        'partition_name as partitionName',
        'range_start as rangeStart',
        'range_end as rangeEnd',
        'retention_days as retentionDays',
        'archived_at as archivedAt',
        'dropped_at as droppedAt',
        'storage_bucket as storageBucket',
        'storage_key as storageKey',
        'row_count as rowCount',
        'byte_size as byteSize',
        'checksum',
        'metadata'
      )
      .modify((builder) => {
        if (tableName) {
          builder.where('table_name', tableName);
        }
        if (!includeDropped) {
          builder.whereNull('dropped_at');
        }
      })
      .orderBy('archived_at', 'desc')
      .limit(limit);

    return rows.map((row) => ({
      ...row,
      rowCount: Number(row.rowCount ?? 0),
      byteSize: Number(row.byteSize ?? 0),
      metadata: safeJsonParse(row.metadata)
    }));
  }

  async rotate({ dryRun = this.config.dryRun } = {}) {
    const runId = randomUUID();

    if (!this.enabled) {
      this.logger.warn({ runId }, 'Data partitioning disabled; skipping rotation cycle');
      return { runId, dryRun, status: 'disabled', results: [] };
    }

    const policies = await this.repositories.fetchPolicies();
    const results = [];

    for (const policy of policies) {
      if (policy.strategy !== 'monthly_range') {
        this.logger.debug({ policyId: policy.id, strategy: policy.strategy }, 'Skipping unsupported partitioning strategy');
        continue;
      }

      const outcome = {
        policyId: policy.id,
        tableName: policy.tableName,
        ensured: [],
        archived: [],
        status: 'ok'
      };

      try {
        const partitions = await this.repositories.fetchPartitions(policy.tableName);
        outcome.ensured = await this.ensureFuturePartitions(policy, partitions, { dryRun });
        outcome.archived = await this.archiveExpiredPartitions(policy, partitions, { dryRun, runId });
      } catch (error) {
        outcome.status = 'failed';
        outcome.error = error.message;
        this.logger.error(
          { err: error, policyId: policy.id, table: policy.tableName, runId },
          'Failed to manage partitions for policy'
        );
      }

      results.push(outcome);
    }

    const summary = {
      runId,
      dryRun,
      executedAt: new Date().toISOString(),
      results
    };

    this.logger.info({ runId, dryRun, policies: results.length }, 'Data partition rotation completed');
    return summary;
  }

  async ensureFuturePartitions(policy, partitions, { dryRun }) {
    const additions = [];
    const normalized = new Map();

    for (const partition of partitions) {
      if (partition.start && partition.end) {
        normalized.set(partition.name, partition);
      } else {
        const decoded = decodePartitionLabel(partition.name);
        if (decoded) {
          Object.assign(partition, decoded);
          normalized.set(decoded.name, partition);
        }
      }
    }

    const lookahead = Number(this.config.lookaheadMonths ?? 0);
    const lookbehind = Number(this.config.lookbehindMonths ?? 0);
    const base = this.atMonthStart(this.clock());

    for (let offset = -lookbehind; offset <= lookahead; offset += 1) {
      const candidate = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + offset, 1));
      const descriptor = buildMonthlyPartitionDescriptor(candidate);
      if (normalized.has(descriptor.name)) {
        continue;
      }

      if (dryRun) {
        additions.push({ partition: descriptor.name, status: 'planned' });
        continue;
      }

      try {
        await this.repositories.addPartition(policy.tableName, descriptor);
        additions.push({ partition: descriptor.name, status: 'created' });
        partitions.push(descriptor);
        normalized.set(descriptor.name, descriptor);
        this.logger.info({ table: policy.tableName, partition: descriptor.name }, 'Created future partition');
      } catch (error) {
        if (error?.code === 'ER_SAME_NAME_PARTITION') {
          this.logger.debug({ table: policy.tableName, partition: descriptor.name }, 'Partition already exists');
        } else {
          throw error;
        }
      }
    }

    return additions;
  }

  async archiveExpiredPartitions(policy, partitions, { dryRun, runId }) {
    const results = [];
    const retentionDays = Number(policy.retentionDays ?? 0);
    const metadata = policy.metadata ?? {};
    const graceDays = Number(metadata.archiveGraceDays ?? this.config.archiveGraceDays ?? 0);
    const minActive = Number(metadata.minActivePartitions ?? this.config.minActivePartitions ?? 1);
    const manualApprovalRequired = metadata.manualApprovalRequired === true;
    const skipDrop = metadata.skipDrop === true;
    const cutoff = this.computeCutoffDate(retentionDays + graceDays);

    const sortable = partitions
      .map((partition) => {
        if (partition.start && partition.end) {
          return partition;
        }
        return decodePartitionLabel(partition.name);
      })
      .filter((entry) => entry && entry.name !== 'pmax')
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    let remaining = sortable.length;

    for (const partition of sortable) {
      if (remaining <= minActive) {
        break;
      }

      if (partition.end.getTime() > cutoff.getTime()) {
        continue;
      }

      const summary = {
        partition: partition.name,
        start: partition.start.toISOString(),
        end: partition.end.toISOString(),
        status: 'skipped',
        reason: null
      };

      if (manualApprovalRequired) {
        summary.reason = 'manual_approval_required';
        results.push(summary);
        continue;
      }

      const existingArchive = await this.repositories.findArchive(policy.tableName, partition.name);

      if (existingArchive) {
        if (existingArchive.dropped_at) {
          summary.reason = 'already_dropped';
          results.push(summary);
          continue;
        }

        if (dryRun) {
          summary.status = skipDrop ? 'archived' : 'planned-drop';
          summary.reason = 'archive_record_present';
          results.push(summary);
          continue;
        }

        if (skipDrop) {
          summary.status = 'archived';
          summary.reason = 'drop_disabled';
          summary.bucket = existingArchive.storage_bucket;
          summary.key = existingArchive.storage_key;
          summary.rowCount = Number(existingArchive.row_count ?? 0);
          summary.byteSize = Number(existingArchive.byte_size ?? 0);
          summary.checksum = existingArchive.checksum ?? null;
          results.push(summary);
          continue;
        }

        await this.repositories.dropPartition(policy.tableName, partition.name);
        await this.repositories.markArchiveDropped(existingArchive.id);
        summary.status = 'dropped';
        summary.reason = 'archive_record_present';
        summary.bucket = existingArchive.storage_bucket;
        summary.key = existingArchive.storage_key;
        summary.rowCount = Number(existingArchive.row_count ?? 0);
        summary.byteSize = Number(existingArchive.byte_size ?? 0);
        summary.checksum = existingArchive.checksum ?? null;
        results.push(summary);
        remaining -= 1;
        this.logger.info(
          { table: policy.tableName, partition: partition.name, runId },
          'Dropped partition after confirming prior archive'
        );
        continue;
      }

      if (dryRun) {
        summary.status = 'planned-archive';
        summary.reason = 'retention_window_elapsed';
        results.push(summary);
        continue;
      }

      try {
        const archiveBucket = metadata.archiveBucket ?? this.config.archive.bucket;
        const archivePrefix = normalizeArchivePrefix(metadata.archivePrefix, this.config.archive.prefix ?? 'archives');
        const visibility = metadata.archiveVisibility ?? this.config.archive.visibility ?? 'workspace';

        const archiveResult = await this.archivePartition({
          policy,
          partition,
          bucket: archiveBucket,
          prefix: archivePrefix,
          visibility,
          runId
        });

        summary.status = 'archived';
        summary.bucket = archiveResult.bucket;
        summary.key = archiveResult.key;
        summary.rowCount = archiveResult.rowCount;
        summary.byteSize = archiveResult.byteSize;
        summary.checksum = archiveResult.checksum;

        if (!skipDrop) {
          await this.repositories.dropPartition(policy.tableName, partition.name);
          await this.repositories.markArchiveDropped(archiveResult.archiveId);
          remaining -= 1;
          this.logger.info(
            { table: policy.tableName, partition: partition.name, runId },
            'Archived and dropped partition following retention window'
          );
        } else {
          summary.reason = 'drop_disabled';
        }

        results.push(summary);
      } catch (error) {
        summary.status = 'failed';
        summary.reason = error.message;
        results.push(summary);
        this.logger.error(
          { err: error, table: policy.tableName, partition: partition.name, runId },
          'Failed to archive partition'
        );
      }
    }

    return results;
  }

  async archivePartition({ policy, partition, bucket, prefix, visibility, runId }) {
    const archivePrefix = normalizeArchivePrefix(prefix, this.config.archive.prefix ?? 'archives');
    const sanitizedPrefix = archivePrefix ? `${archivePrefix}/` : '';
    const key = `${sanitizedPrefix}${policy.tableName}/${partition.name}/${policy.tableName}-${partition.name}-${Date.now()}-${randomUUID()}.ndjson`;

    const passThrough = new PassThrough();
    const hash = createHash('sha256');
    let rowCount = 0;
    let byteCount = 0;
    const maxRows = this.config.maxExportRows ?? null;
    const maxBytes = this.config.maxExportBytes ?? null;

    const transform = new Transform({
      objectMode: true,
      transform: (row, _encoding, callback) => {
        try {
          const line = `${JSON.stringify(row)}\n`;
          rowCount += 1;
          byteCount += Buffer.byteLength(line);
          hash.update(line);

          if (maxRows && rowCount > maxRows) {
            callback(new Error(`Partition export exceeded maximum row limit (${maxRows})`));
            return;
          }

          if (maxBytes && byteCount > maxBytes) {
            callback(new Error(`Partition export exceeded maximum size limit (${maxBytes} bytes)`));
            return;
          }

          callback(null, line);
        } catch (error) {
          callback(error);
        }
      }
    });

    const uploadPromise = this.storage.uploadStream({
      bucket,
      key,
      stream: passThrough,
      contentType: 'application/x-ndjson',
      visibility,
      metadata: {
        'partition-table': policy.tableName,
        'partition-name': partition.name,
        'retention-days': String(policy.retentionDays ?? 0),
        'run-id': runId
      }
    });

    const queryStream = this.repositories.streamPartitionRows({
      tableName: policy.tableName,
      dateColumn: policy.dateColumn,
      start: partition.start,
      end: partition.end
    });

    await pipeline(queryStream, transform, passThrough);

    const uploadResult = await uploadPromise;
    const checksum = hash.digest('hex');

    const archiveRecord = {
      table_name: policy.tableName,
      partition_name: partition.name,
      range_start: partition.start,
      range_end: partition.end,
      retention_days: policy.retentionDays,
      archived_at: this.knex.fn.now(),
      storage_bucket: uploadResult.bucket,
      storage_key: uploadResult.key,
      row_count: rowCount,
      byte_size: byteCount,
      checksum,
      metadata: {
        policyId: policy.id,
        strategy: policy.strategy,
        visibility,
        prefix: archivePrefix
      }
    };

    const { id } = await this.repositories.recordArchive(archiveRecord);

    return {
      archiveId: id,
      bucket: uploadResult.bucket,
      key: uploadResult.key,
      rowCount,
      byteSize: byteCount,
      checksum
    };
  }

  atMonthStart(date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  }

  computeCutoffDate(totalDays) {
    const now = this.clock();
    const cutoff = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const days = Number.isFinite(totalDays) ? Number(totalDays) : 0;
    cutoff.setUTCDate(cutoff.getUTCDate() - Math.max(0, Math.floor(days)));
    return cutoff;
  }
}

const dataPartitionService = new DataPartitionService();

export default dataPartitionService;
