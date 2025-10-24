import crypto from 'crypto';
import { z } from 'zod';

import { env } from '../config/env.js';
import logger from '../config/logger.js';
import TelemetryConsentLedgerModel from '../models/TelemetryConsentLedgerModel.js';
import TelemetryEventModel from '../models/TelemetryEventModel.js';
import TelemetryFreshnessMonitorModel from '../models/TelemetryFreshnessMonitorModel.js';
import { generateTelemetryDedupeHash } from '../database/domains/telemetry.js';
import {
  recordTelemetryIngestion,
  recordTelemetryFreshness
} from '../observability/metrics.js';
import {
  formatZodIssues,
  serialiseConsentRecord,
  serialiseTelemetryEvent
} from '../utils/telemetrySerializers.js';
import { getEnvironmentDescriptor } from '../utils/environmentContext.js';

const PAYLOAD_SCHEMA = z
  .union([z.record(z.any()), z.array(z.any())])
  .default({})
  .transform((value) => value ?? {});

const EVENT_SCHEMA = z.object({
  tenantId: z.string().trim().min(1).optional(),
  eventName: z.string().trim().min(1),
  eventVersion: z.string().trim().min(1).optional(),
  eventSource: z.string().trim().min(1),
  schemaVersion: z.string().trim().min(1).default('v1'),
  occurredAt: z.coerce.date().optional(),
  receivedAt: z.coerce.date().optional(),
  userId: z.coerce.number().int().positive().optional(),
  sessionId: z.string().trim().max(128).optional(),
  deviceId: z.string().trim().max(128).optional(),
  correlationId: z.string().trim().max(64).optional(),
  consentScope: z.string().trim().min(1).optional(),
  payload: PAYLOAD_SCHEMA,
  context: z.record(z.any()).default({}),
  metadata: z.record(z.any()).default({}),
  tags: z.array(z.string().trim()).default([])
});

function hashValue(value) {
  if (!value) {
    return null;
  }

  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function normaliseScope(scope, defaultScope) {
  if (!scope) {
    return defaultScope;
  }
  const trimmed = scope.trim();
  return trimmed ? trimmed : defaultScope;
}

function shouldRejectSource(source, allowedSources = [], strict = false) {
  if (!Array.isArray(allowedSources) || allowedSources.length === 0) {
    return false;
  }
  if (allowedSources.includes(source)) {
    return false;
  }
  return strict;
}

export class TelemetryIngestionService {
  constructor({
    consentModel = TelemetryConsentLedgerModel,
    eventModel = TelemetryEventModel,
    freshnessModel = TelemetryFreshnessMonitorModel,
    loggerInstance = logger.child({ service: 'TelemetryIngestionService' }),
    config = env.telemetry
  } = {}) {
    this.consentModel = consentModel;
    this.eventModel = eventModel;
    this.freshnessModel = freshnessModel;
    this.logger = loggerInstance;

    const ingestionConfig = config?.ingestion ?? {};
    const freshnessConfig = config?.freshness ?? {};

    this.environment = getEnvironmentDescriptor(config?.environment ?? {});

    this.config = {
      enabled: ingestionConfig.enabled !== false,
      defaultScope: ingestionConfig.defaultScope ?? 'product.analytics',
      allowedSources: ingestionConfig.allowedSources ?? [],
      strictSourceEnforcement: ingestionConfig.strictSourceEnforcement ?? false,
      hardBlockWithoutConsent: ingestionConfig.consent?.hardBlockWithoutConsent ?? true,
      consentDefaultVersion: ingestionConfig.consent?.defaultVersion ?? 'v1',
      freshnessThresholdMinutes: freshnessConfig.ingestionThresholdMinutes ?? 15
    };
  }

  async registerConsentDecision(payload) {
    return this.consentModel.recordDecision({ ...payload, environment: this.environment });
  }

  async getActiveConsent(query) {
    return this.consentModel.getActiveConsent({ ...query, environment: this.environment });
  }

  async ingestEvent(rawPayload, { actorId, ipAddress, userAgent } = {}) {
    if (!this.config.enabled) {
      const error = new Error('Telemetry ingestion pipeline is disabled');
      error.status = 503;
      throw error;
    }

    const validation = EVENT_SCHEMA.safeParse(rawPayload ?? {});
    if (!validation.success) {
      const error = new Error('Telemetry event payload is invalid');
      error.status = 422;
      error.code = 'INVALID_TELEMETRY_EVENT';
      error.details = formatZodIssues(validation.error.issues);
      throw error;
    }

    const parsed = validation.data;
    const tenantId = parsed.tenantId ?? 'global';
    const correlationId = parsed.correlationId ?? crypto.randomUUID().replace(/-/g, '').slice(0, 32);
    const consentScope = normaliseScope(parsed.consentScope, this.config.defaultScope);

    if (shouldRejectSource(parsed.eventSource, this.config.allowedSources, this.config.strictSourceEnforcement)) {
      const error = new Error(`Telemetry source "${parsed.eventSource}" is not authorised for ingestion.`);
      error.status = 403;
      throw error;
    }

    const consentRecord = await this.consentModel.getActiveConsent({
      userId: parsed.userId,
      consentScope,
      tenantId
    });

    const hasConsent = consentRecord?.status === 'granted';
    const consentStatus = hasConsent ? 'granted' : consentRecord?.status ?? 'revoked';
    const ingestionStatus = !hasConsent && this.config.hardBlockWithoutConsent ? 'suppressed' : 'pending';

    const occurredAt = parsed.occurredAt ?? new Date();
    const receivedAt = parsed.receivedAt ?? new Date();
    const context = {
      ...parsed.context,
      network: {
        ipHash: hashValue(ipAddress),
        userAgent: userAgent ?? null
      },
      actor: actorId ?? null
    };

    const metadata = {
      ...parsed.metadata,
      consentVersion: consentRecord?.consentVersion ?? this.config.consentDefaultVersion,
      consentRecordedAt: consentRecord?.recordedAt ?? null
    };

    const dedupeHash = generateTelemetryDedupeHash({
      eventName: parsed.eventName,
      eventVersion: parsed.eventVersion,
      occurredAt,
      userId: parsed.userId,
      sessionId: parsed.sessionId,
      correlationId,
      payload: parsed.payload
    });

    const { event, duplicate } = await this.eventModel.create({
      tenantId,
      eventName: parsed.eventName,
      eventVersion: parsed.eventVersion,
      eventSource: parsed.eventSource,
      schemaVersion: parsed.schemaVersion,
      occurredAt,
      receivedAt,
      userId: parsed.userId ?? null,
      sessionId: parsed.sessionId ?? null,
      deviceId: parsed.deviceId ?? null,
      correlationId,
      consentScope,
      consentStatus,
      ingestionStatus,
      payload: parsed.payload,
      context,
      metadata,
      tags: parsed.tags,
      dedupeHash,
      environment: this.environment
    });

    const resolvedStatus = duplicate ? 'duplicate' : event.ingestionStatus;
    const eventRecord = duplicate ? { ...event, ingestionStatus: 'duplicate' } : event;

    recordTelemetryIngestion({
      scope: consentScope,
      source: parsed.eventSource,
      status: resolvedStatus
    });

    await this.freshnessModel.touchCheckpoint('ingestion.raw', {
      lastEventAt: occurredAt,
      thresholdMinutes: this.config.freshnessThresholdMinutes,
      metadata: {
        eventId: eventRecord.id,
        eventName: eventRecord.eventName,
        ingestionStatus: resolvedStatus
      }
    });

    recordTelemetryFreshness({
      pipeline: 'ingestion.raw',
      status: resolvedStatus,
      lastEventAt: occurredAt,
      thresholdMinutes: this.config.freshnessThresholdMinutes
    });

    return {
      event: serialiseTelemetryEvent(eventRecord),
      duplicate,
      consent: serialiseConsentRecord(consentRecord),
      suppressed: resolvedStatus === 'suppressed'
    };
  }
}

const telemetryIngestionService = new TelemetryIngestionService();

export default telemetryIngestionService;
