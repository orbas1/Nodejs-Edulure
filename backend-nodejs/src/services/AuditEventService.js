import db from '../config/database.js';
import logger from '../config/logger.js';
import { env } from '../config/env.js';
import { TABLES as COMPLIANCE_TABLES } from '../database/domains/compliance.js';
import { getRequestContext } from '../observability/requestContext.js';
import dataEncryptionService from './DataEncryptionService.js';

const DEFAULT_SEVERITIES = new Set(['info', 'notice', 'warning', 'error', 'critical']);
const DEFAULT_METADATA_REDACTIONS = ['ip', 'ipaddress', 'clientip'];
const MAX_METADATA_DEPTH = 6;
const MAX_ARRAY_ENTRIES = 25;

function ensureLogger(candidateLogger) {
  if (!candidateLogger || typeof candidateLogger.info !== 'function') {
    return logger.child({ module: 'audit-event-service' });
  }
  return candidateLogger;
}

function buildConfig(rawConfig = {}) {
  const metadataRedactionKeys = new Set(
    (rawConfig.metadataRedactionKeys && rawConfig.metadataRedactionKeys.length
      ? rawConfig.metadataRedactionKeys
      : DEFAULT_METADATA_REDACTIONS
    )
      .filter(Boolean)
      .map((key) => key.toLowerCase())
  );

  const allowedEventTypes = new Set((rawConfig.allowedEventTypes ?? []).filter(Boolean));

  return {
    tenantId: rawConfig.tenantId ?? 'global',
    defaultSeverity: DEFAULT_SEVERITIES.has((rawConfig.defaultSeverity ?? '').toLowerCase())
      ? rawConfig.defaultSeverity.toLowerCase()
      : 'info',
    allowedEventTypes,
    enableIpCapture: rawConfig.enableIpCapture !== false,
    ipClassificationTag: rawConfig.ipClassificationTag ?? 'restricted',
    maxMetadataBytes: Number(rawConfig.maxMetadataBytes ?? 8192),
    metadataRedactionKeys,
    includeRequestContext: rawConfig.includeRequestContext !== false
  };
}

function normalizeActor(actor) {
  if (!actor || typeof actor !== 'object') {
    return { id: null, type: 'system', role: 'system' };
  }
  return {
    id: actor.id ?? null,
    type: actor.type ?? 'system',
    role: actor.role ?? 'system'
  };
}

function normalizeString(value, { name, max = 255, allowEmpty = false }) {
  if (value === undefined || value === null) {
    if (allowEmpty) {
      return null;
    }
    throw new Error(`${name} is required`);
  }
  const trimmed = String(value).trim();
  if (!trimmed && !allowEmpty) {
    throw new Error(`${name} cannot be empty`);
  }
  if (trimmed.length > max) {
    return trimmed.slice(0, max);
  }
  return trimmed;
}

function sanitizePrimitive(value) {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    if (Number.isFinite(value)) {
      return value;
    }
    return null;
  }
  if (typeof value === 'bigint') {
    return value.toString();
  }
  if (typeof value === 'string') {
    return value.length <= 4096 ? value : `${value.slice(0, 4093)}...`;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Buffer.isBuffer(value)) {
    return { type: 'Buffer', encoding: 'base64', data: value.toString('base64') };
  }
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack ? value.stack.split('\n').slice(0, 10).join('\n') : undefined
    };
  }
  return String(value);
}

export default class AuditEventService {
  constructor({
    connection = db,
    encryptionService = dataEncryptionService,
    loggerInstance = null,
    config = env.security?.auditLog ?? {}
  } = {}) {
    this.connection = connection;
    this.encryptionService = encryptionService;
    this.logger = ensureLogger(loggerInstance);
    this.config = buildConfig(config);
  }

  async record({
    eventType,
    entityType,
    entityId,
    severity,
    actor,
    metadata,
    tenantId,
    requestContext,
    occurredAt
  }) {
    const normalisedEventType = normalizeString(eventType, { name: 'eventType' });
    if (this.config.allowedEventTypes.size && !this.config.allowedEventTypes.has(normalisedEventType)) {
      throw new Error(`eventType "${normalisedEventType}" is not permitted by audit log policy`);
    }

    const normalisedEntityType = normalizeString(entityType, { name: 'entityType' });
    const normalisedEntityId = normalizeString(entityId, { name: 'entityId' });
    const normalisedSeverity = this.#normaliseSeverity(severity);
    const normalisedActor = normalizeActor(actor);
    const context = this.#resolveRequestContext(requestContext);
    const ipPayload = this.#encryptIp(context.ipAddress);
    const metadataEnvelope = this.#prepareMetadata(metadata, context);

    const auditMeta = {
      ipClassification: this.config.ipClassificationTag,
      truncated: metadataEnvelope.truncated,
      originalBytes: metadataEnvelope.originalBytes,
      storedBytes: metadataEnvelope.storedBytes,
      discardedKeys: metadataEnvelope.discardedKeys,
      redactionKeys: Array.from(this.config.metadataRedactionKeys),
      traceId: context.traceId ?? null
    };

    const row = {
      event_uuid: this.connection.raw('(UUID())'),
      tenant_id: tenantId ?? this.config.tenantId,
      actor_id: normalisedActor.id,
      actor_type: normalisedActor.type,
      actor_role: normalisedActor.role,
      event_type: normalisedEventType,
      event_severity: normalisedSeverity,
      entity_type: normalisedEntityType,
      entity_id: normalisedEntityId,
      payload: metadataEnvelope.metadata,
      ip_address_ciphertext: ipPayload.ciphertext,
      ip_address_hash: ipPayload.hash,
      request_id: context.requestId,
      occurred_at: occurredAt ?? this.connection.fn.now(),
      ingested_at: this.connection.fn.now(),
      encryption_key_version: ipPayload.keyId,
      metadata: auditMeta
    };

    try {
      await this.connection(COMPLIANCE_TABLES.AUDIT_EVENTS).insert(row);
    } catch (error) {
      this.logger.error(
        { err: error, eventType: normalisedEventType, entityType: normalisedEntityType },
        'Failed to persist audit event'
      );
      throw error;
    }
  }

  #normaliseSeverity(candidate) {
    if (!candidate || typeof candidate !== 'string') {
      return this.config.defaultSeverity;
    }
    const lower = candidate.toLowerCase();
    if (DEFAULT_SEVERITIES.has(lower)) {
      return lower;
    }
    this.logger.warn({ severity: candidate }, 'Unsupported audit severity, defaulting to policy value');
    return this.config.defaultSeverity;
  }

  #resolveRequestContext(requestContext = {}) {
    const asyncContext = getRequestContext() ?? {};
    return {
      requestId: requestContext.requestId ?? asyncContext.traceId ?? null,
      traceId: requestContext.traceId ?? asyncContext.traceId ?? null,
      spanId: requestContext.spanId ?? asyncContext.spanId ?? null,
      ipAddress: requestContext.ipAddress ?? asyncContext.ip ?? null,
      userAgent: requestContext.userAgent ?? asyncContext.userAgent ?? null,
      method: requestContext.method ?? asyncContext.method ?? null,
      path: requestContext.path ?? asyncContext.path ?? null
    };
  }

  #encryptIp(ipAddress) {
    if (!this.config.enableIpCapture) {
      const inactive = this.encryptionService.encryptStructured(null);
      return { ciphertext: null, hash: null, keyId: inactive.keyId };
    }

    const source = typeof ipAddress === 'string' ? ipAddress.trim() : '';
    if (!source) {
      const inactive = this.encryptionService.encryptStructured(null);
      return { ciphertext: null, hash: null, keyId: inactive.keyId };
    }

    const encrypted = this.encryptionService.encryptStructured(source, {
      classificationTag: this.config.ipClassificationTag,
      fingerprintValues: [source]
    });

    return {
      ciphertext: encrypted.ciphertext,
      hash: encrypted.fingerprint ?? encrypted.hash,
      keyId: encrypted.keyId
    };
  }

  #prepareMetadata(metadata, context) {
    const sanitised = this.#sanitiseMetadata(metadata, 0);
    const augmented = this.config.includeRequestContext
      ? this.#attachRequestContext(sanitised, context)
      : sanitised;

    const serialized = JSON.stringify(augmented);
    const size = Buffer.byteLength(serialized, 'utf8');

    if (size <= this.config.maxMetadataBytes) {
      return {
        metadata: augmented,
        truncated: false,
        originalBytes: size,
        storedBytes: size,
        discardedKeys: []
      };
    }

    const truncatedPayload = this.#truncateMetadata(augmented, size);
    return truncatedPayload;
  }

  #attachRequestContext(metadata, context) {
    const envelope = { ...metadata };
    const requestContext = {
      id: context.requestId ?? undefined,
      traceId: context.traceId ?? undefined,
      spanId: context.spanId ?? undefined,
      method: context.method ?? undefined,
      path: context.path ?? undefined,
      userAgent: context.userAgent ?? undefined
    };

    const pruned = Object.fromEntries(
      Object.entries(requestContext).filter(([, value]) => value !== undefined && value !== null && value !== '')
    );

    if (Object.keys(pruned).length) {
      envelope.__requestContext = pruned;
    }
    return envelope;
  }

  #sanitiseMetadata(source, depth) {
    if (depth >= MAX_METADATA_DEPTH) {
      return '[max-depth-reached]';
    }

    if (Array.isArray(source)) {
      return source.slice(0, MAX_ARRAY_ENTRIES).map((entry) => this.#sanitiseMetadata(entry, depth + 1));
    }

    if (source && typeof source === 'object' && !Buffer.isBuffer(source) && !(source instanceof Date) && !(source instanceof Error)) {
      const output = {};
      for (const [key, value] of Object.entries(source)) {
        if (value === undefined) {
          continue;
        }
        const lowerKey = key.toLowerCase();
        if (this.config.metadataRedactionKeys.has(lowerKey)) {
          output[key] = '[REDACTED]';
          continue;
        }
        output[key] = this.#sanitiseMetadata(value, depth + 1);
      }
      return output;
    }

    return sanitizePrimitive(source);
  }

  #truncateMetadata(metadata, originalSize) {
    const entries = Object.entries(metadata);
    const result = {};
    const discarded = [];

    for (const [key, value] of entries) {
      const candidate = { ...result, [key]: value };
      const candidateSize = Buffer.byteLength(JSON.stringify(candidate), 'utf8');
      if (candidateSize > this.config.maxMetadataBytes) {
        discarded.push(key);
        continue;
      }
      result[key] = value;
    }

    const messageParts = [`Metadata trimmed from ${originalSize} bytes to ${Buffer.byteLength(JSON.stringify(result), 'utf8')} bytes.`];
    if (discarded.length) {
      messageParts.push(`Discarded keys: ${discarded.join(', ')}`);
    }
    result.__truncated__ = messageParts.join(' ');

    const storedBytes = Buffer.byteLength(JSON.stringify(result), 'utf8');

    return {
      metadata: result,
      truncated: true,
      originalBytes: originalSize,
      storedBytes,
      discardedKeys: discarded
    };
  }
}
