function isPlainObject(value) {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function normaliseValue(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => normaliseValue(entry));
  }
  if (isPlainObject(value)) {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = normaliseValue(value[key]);
        return acc;
      }, {});
  }
  return value;
}

function cloneJson(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => cloneJson(entry));
  }
  if (isPlainObject(value)) {
    return Object.keys(value).reduce((acc, key) => {
      acc[key] = cloneJson(value[key]);
      return acc;
    }, {});
  }
  return value;
}

function stableStringify(value) {
  try {
    return JSON.stringify(normaliseValue(value));
  } catch (_error) {
    return String(value);
  }
}

export function formatZodIssues(issues = []) {
  if (!Array.isArray(issues)) {
    return [];
  }

  return issues.map((issue) => ({
    path: Array.isArray(issue?.path) && issue.path.length ? issue.path.join('.') : '',
    message: issue?.message,
    code: issue?.code ?? undefined
  }));
}

export function serialiseTelemetryEvent(event) {
  if (!event) {
    return null;
  }

  const rawTags = event.tags ?? event.tags ?? [];
  let tags;
  if (Array.isArray(rawTags)) {
    tags = [...rawTags];
  } else if (typeof rawTags === 'string') {
    try {
      const parsed = JSON.parse(rawTags);
      tags = Array.isArray(parsed) ? [...parsed] : [rawTags];
    } catch (_error) {
      tags = [rawTags];
    }
  } else {
    tags = [];
  }

  return {
    id: event.id ?? null,
    eventUuid: event.eventUuid ?? event.event_uuid ?? null,
    eventName: event.eventName ?? event.event_name ?? null,
    eventSource: event.eventSource ?? event.event_source ?? null,
    eventVersion: event.eventVersion ?? event.event_version ?? null,
    schemaVersion: event.schemaVersion ?? event.schema_version ?? null,
    occurredAt: event.occurredAt ?? event.occurred_at ?? null,
    receivedAt: event.receivedAt ?? event.received_at ?? null,
    createdAt: event.createdAt ?? event.created_at ?? null,
    updatedAt: event.updatedAt ?? event.updated_at ?? null,
    consentScope: event.consentScope ?? event.consent_scope ?? null,
    consentStatus: event.consentStatus ?? event.consent_status ?? null,
    ingestionStatus: event.ingestionStatus ?? event.ingestion_status ?? null,
    ingestionAttempts: event.ingestionAttempts ?? event.ingestion_attempts ?? 0,
    lastIngestionAttempt: event.lastIngestionAttempt ?? event.last_ingestion_attempt ?? null,
    exportBatchId: event.exportBatchId ?? event.export_batch_id ?? null,
    dedupeHash: event.dedupeHash ?? event.dedupe_hash ?? null,
    tenantId: event.tenantId ?? event.tenant_id ?? 'global',
    environment: {
      key: event.environment?.key ?? event.environment_key ?? null,
      name: event.environment?.name ?? event.environment_name ?? null,
      tier: event.environment?.tier ?? event.environment_tier ?? null,
      region: event.environment?.region ?? event.environment_region ?? null,
      workspace: event.environment?.workspace ?? event.environment_workspace ?? null
    },
    userId: event.userId ?? event.user_id ?? null,
    sessionId: event.sessionId ?? event.session_id ?? null,
    deviceId: event.deviceId ?? event.device_id ?? null,
    correlationId: event.correlationId ?? event.correlation_id ?? null,
    tags,
    metadata: cloneJson(event.metadata ?? {}),
    context: cloneJson(event.context ?? {}),
    payload: cloneJson(event.payload ?? {})
  };
}

export function serialiseConsentRecord(record) {
  if (!record) {
    return null;
  }
  return {
    id: record.id ?? null,
    userId: record.userId ?? record.user_id ?? null,
    tenantId: record.tenantId ?? record.tenant_id ?? 'global',
    environment: {
      key: record.environment?.key ?? record.environment_key ?? null,
      name: record.environment?.name ?? record.environment_name ?? null,
      tier: record.environment?.tier ?? record.environment_tier ?? null,
      region: record.environment?.region ?? record.environment_region ?? null,
      workspace: record.environment?.workspace ?? record.environment_workspace ?? null
    },
    consentScope: record.consentScope ?? record.consent_scope ?? null,
    consentVersion: record.consentVersion ?? record.consent_version ?? null,
    status: record.status ?? null,
    effectiveAt: record.effectiveAt ?? record.effective_at ?? null,
    expiresAt: record.expiresAt ?? record.expires_at ?? null,
    revokedAt: record.revokedAt ?? record.revoked_at ?? null,
    recordedAt: record.recordedAt ?? record.recorded_at ?? null,
    recordedBy: record.recordedBy ?? record.recorded_by ?? null,
    metadata: cloneJson(record.metadata ?? {}),
    evidence: cloneJson(record.evidence ?? {}),
    isActive: typeof record.isActive === 'boolean' ? record.isActive : Boolean(record.is_active)
  };
}

export function diffObjects(previous, next, fields) {
  if (!previous || !next || !Array.isArray(fields)) {
    return { changed: false, changes: {} };
  }
  const changes = {};
  for (const field of fields) {
    const before = previous[field];
    const after = next[field];
    if (stableStringify(before) !== stableStringify(after)) {
      changes[field] = { previous: before ?? null, next: after ?? null };
    }
  }
  return { changed: Object.keys(changes).length > 0, changes };
}
