import IntegrationApiKeyModel from '../models/IntegrationApiKeyModel.js';
import dataEncryptionService from './DataEncryptionService.js';

export const PROVIDER_CATALOGUE = {
  openai: { id: 'openai', label: 'OpenAI', rotationDefaults: 90 },
  anthropic: { id: 'anthropic', label: 'Anthropic Claude', rotationDefaults: 90 },
  grok: { id: 'grok', label: 'XAI Grok', rotationDefaults: 60 },
  'azure-openai': { id: 'azure-openai', label: 'Azure OpenAI', rotationDefaults: 60 },
  'google-vertex': { id: 'google-vertex', label: 'Google Vertex AI', rotationDefaults: 60 }
};

const ALLOWED_ENVIRONMENTS = new Set(['production', 'staging', 'sandbox']);
const SENSITIVE_EMAIL_DOMAINS = new Set(['gmail.com', 'yahoo.com', 'hotmail.com']);
export const MIN_ROTATION_DAYS = 30;
export const MAX_ROTATION_DAYS = 365;
export const ROTATION_WARNING_DAYS = 14;
export const MIN_KEY_LENGTH = 20;

export function normaliseProvider(provider) {
  if (!provider) return null;
  const key = String(provider).toLowerCase();
  if (PROVIDER_CATALOGUE[key]) {
    return PROVIDER_CATALOGUE[key].id;
  }
  return null;
}

export function normaliseEnvironment(environment) {
  if (!environment) return 'production';
  const value = String(environment).toLowerCase();
  if (ALLOWED_ENVIRONMENTS.has(value)) {
    return value;
  }
  return null;
}

export function clampRotationInterval(value, provider) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return PROVIDER_CATALOGUE[provider]?.rotationDefaults ?? 90;
  }
  return Math.min(Math.max(Math.round(parsed), MIN_ROTATION_DAYS), MAX_ROTATION_DAYS);
}

export function isValidEmail(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

function ensureOwnerEmailDomain(email) {
  if (!isValidEmail(email)) {
    throw Object.assign(new Error('Owner email is invalid'), { status: 422 });
  }

  const [, domain] = email.trim().toLowerCase().split('@');
  if (!domain) {
    throw Object.assign(new Error('Owner email domain is required'), { status: 422 });
  }

  if (SENSITIVE_EMAIL_DOMAINS.has(domain)) {
    throw Object.assign(new Error('Personal email domains are not permitted for integration keys'), { status: 422 });
  }

  return email.trim();
}

function sanitizeNotes(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const text = String(value).trim();
  return text.length ? text.slice(0, 500) : null;
}

function buildAuditFingerprint(record) {
  if (!record) return null;
  return [record.provider, record.environment, record.alias, record.lastFour].filter(Boolean).join('::');
}

function deriveRiskLevel({ rotationIntervalDays, status, metadata }) {
  if (status === 'disabled') {
    return 'inactive';
  }

  const interval = Number(rotationIntervalDays ?? 0);
  const rotationCount = Array.isArray(metadata?.rotationHistory) ? metadata.rotationHistory.length : 0;

  if (!interval || interval > 180) {
    return 'high';
  }

  if (rotationCount <= 1 || interval > 120) {
    return 'elevated';
  }

  return 'normal';
}

export function requireString(value, field, { min = 1, max = 255 } = {}) {
  if (typeof value !== 'string') {
    throw Object.assign(new Error(`${field} is required`), { status: 422 });
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed.length < min) {
    throw Object.assign(new Error(`${field} must be at least ${min} characters`), { status: 422 });
  }
  if (trimmed.length > max) {
    throw Object.assign(new Error(`${field} must be ${max} characters or fewer`), { status: 422 });
  }
  return trimmed;
}

function addDays(date, days) {
  const ms = Number(days) * 24 * 60 * 60 * 1000;
  const value = date instanceof Date ? date.getTime() : new Date(date).getTime();
  if (!Number.isFinite(ms) || !Number.isFinite(value)) {
    return null;
  }
  return new Date(value + ms);
}

function daysBetween(from, to) {
  if (!from || !to) return null;
  const diff = to.getTime() - from.getTime();
  if (!Number.isFinite(diff)) return null;
  return Math.round(diff / (24 * 60 * 60 * 1000));
}

function sanitizeRotationHistory(history = []) {
  if (!Array.isArray(history)) {
    return [];
  }
  return history
    .filter((entry) => entry && entry.rotatedAt)
    .sort((a, b) => new Date(b.rotatedAt).getTime() - new Date(a.rotatedAt).getTime())
    .slice(0, 5)
    .map((entry) => ({
      rotatedAt: new Date(entry.rotatedAt).toISOString(),
      rotatedBy: entry.rotatedBy ?? null,
      reason: entry.reason ?? null
    }));
}

export default class IntegrationApiKeyService {
  constructor({
    model = IntegrationApiKeyModel,
    encryptionService = dataEncryptionService,
    nowProvider = () => new Date()
  } = {}) {
    this.model = model;
    this.encryptionService = encryptionService;
    this.nowProvider = nowProvider;
  }

  sanitize(record) {
    if (!record) {
      return null;
    }

    const providerMeta = PROVIDER_CATALOGUE[record.provider] ?? { id: record.provider, label: record.provider };
    const lastRotatedAt = record.lastRotatedAt ?? record.createdAt ?? null;
    const nextRotationAt = record.nextRotationAt ?? (lastRotatedAt ? addDays(lastRotatedAt, record.rotationIntervalDays) : null);
    const now = this.nowProvider();
    const expiresAt = record.expiresAt ?? null;
    const disabledAt = record.disabledAt ?? null;

    let status = record.status ?? 'active';
    if (disabledAt) {
      status = 'disabled';
    } else if (expiresAt && expiresAt.getTime() < now.getTime()) {
      status = 'expired';
    }

    let rotationStatus = status === 'disabled' ? 'disabled' : 'ok';
    const daysUntilRotation = nextRotationAt ? daysBetween(now, nextRotationAt) : null;

    if (status === 'expired') {
      rotationStatus = 'expired';
    } else if (nextRotationAt && now.getTime() > nextRotationAt.getTime()) {
      rotationStatus = 'overdue';
    } else if (
      nextRotationAt &&
      daysUntilRotation !== null &&
      daysUntilRotation <= ROTATION_WARNING_DAYS
    ) {
      rotationStatus = 'due-soon';
    }

    const rotationHistory = sanitizeRotationHistory(record.metadata?.rotationHistory);

    return {
      id: record.id,
      provider: providerMeta.id,
      providerLabel: providerMeta.label,
      environment: record.environment,
      alias: record.alias,
      ownerEmail: record.ownerEmail,
      lastFour: record.lastFour,
      rotationIntervalDays: record.rotationIntervalDays,
      lastRotatedAt: lastRotatedAt ? lastRotatedAt.toISOString() : null,
      nextRotationAt: nextRotationAt ? nextRotationAt.toISOString() : null,
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
      disabledAt: disabledAt ? disabledAt.toISOString() : null,
      createdAt: record.createdAt ? record.createdAt.toISOString() : null,
      updatedAt: record.updatedAt ? record.updatedAt.toISOString() : null,
      status,
      rotationStatus,
      daysUntilRotation,
      rotationHistory,
      metadata: {
        rotationCount: rotationHistory.length,
        lastRotatedBy: rotationHistory[0]?.rotatedBy ?? record.metadata?.lastRotatedBy ?? null,
        notes: record.metadata?.notes ?? null
      }
    };
  }

  async listKeys(filters = {}) {
    const records = await this.model.list(filters);
    return records.map((record) => this.sanitize(record));
  }

  async createKey(
    {
      provider,
      environment,
      alias,
      ownerEmail,
      keyValue,
      rotationIntervalDays,
      expiresAt,
      createdBy,
      notes
    },
    { connection } = {}
  ) {
    const normalisedProvider = normaliseProvider(provider);
    if (!normalisedProvider) {
      throw Object.assign(new Error('Provider is not recognised'), { status: 422 });
    }

    const normalisedEnvironment = normaliseEnvironment(environment);
    if (!normalisedEnvironment) {
      throw Object.assign(new Error('Environment is invalid'), { status: 422 });
    }

    const resolvedAlias = requireString(alias, 'Alias', { min: 3, max: 128 });

    const ownerEmailAddress = ensureOwnerEmailDomain(ownerEmail);

    const trimmedKey = requireString(keyValue, 'API key', { min: MIN_KEY_LENGTH, max: 512 });

    const rotationDays = clampRotationInterval(rotationIntervalDays, normalisedProvider);
    const now = this.nowProvider();
    const expiresDate = expiresAt ? new Date(expiresAt) : null;
    if (expiresDate && !Number.isFinite(expiresDate.getTime())) {
      throw Object.assign(new Error('Expiry date is invalid'), { status: 422 });
    }

    const aliasConflict = await this.model.findByAlias({
      provider: normalisedProvider,
      environment: normalisedEnvironment,
      alias: resolvedAlias
    }, connection);
    if (aliasConflict) {
      throw Object.assign(new Error('Alias already exists for this provider/environment'), { status: 409 });
    }

    const keyHash = this.encryptionService.hash(trimmedKey);
    const hashConflict = await this.model.findByHash(keyHash, connection);
    if (hashConflict && hashConflict.provider === normalisedProvider) {
      throw Object.assign(new Error('API key already registered for this provider'), { status: 409 });
    }

    if (trimmedKey.length < MIN_KEY_LENGTH) {
      throw Object.assign(new Error('API key must be at least 20 characters'), { status: 422 });
    }

    const encrypted = this.encryptionService.encryptStructured(
      { secret: trimmedKey },
      {
        classificationTag: 'integration-secret',
        fingerprintValues: [normalisedProvider, normalisedEnvironment, resolvedAlias, trimmedKey.slice(-8)]
      }
    );

    const lastFour = trimmedKey.slice(-4);
    const nextRotationAt = addDays(now, rotationDays);

    const noteText = sanitizeNotes(notes);

    const metadata = {
      rotationHistory: [
        {
          rotatedAt: now.toISOString(),
          rotatedBy: createdBy ?? ownerEmailAddress,
          reason: 'initial-provision'
        }
      ],
      lastRotatedBy: createdBy ?? ownerEmailAddress,
      notes: noteText
    };

    const createArgs = [
      {
        provider: normalisedProvider,
        environment: normalisedEnvironment,
        alias: resolvedAlias,
        ownerEmail: ownerEmailAddress,
        lastFour,
        keyHash,
        encryptedKey: encrypted.ciphertext,
        encryptionKeyId: encrypted.keyId,
        classificationTag: encrypted.classificationTag,
        rotationIntervalDays: rotationDays,
        lastRotatedAt: now,
        nextRotationAt,
        expiresAt: expiresDate,
        status: 'active',
        metadata,
        createdBy: createdBy ?? ownerEmailAddress,
        updatedBy: createdBy ?? ownerEmailAddress
      }
    ];

    if (connection !== undefined) {
      createArgs.push(connection);
    }

    const record = await this.model.create(...createArgs);

    return this.sanitize(record);
  }

  async rotateKey(id, { keyValue, rotationIntervalDays, expiresAt, rotatedBy, reason, notes }, { connection } = {}) {
    const record = await this.model.findById(id, connection);
    if (!record) {
      throw Object.assign(new Error('API key not found'), { status: 404 });
    }

    if (record.disabledAt) {
      throw Object.assign(new Error('API key is disabled and cannot be rotated'), { status: 409 });
    }

    const trimmedKey = requireString(keyValue, 'API key', { min: MIN_KEY_LENGTH, max: 512 });
    const rotationDays = clampRotationInterval(rotationIntervalDays ?? record.rotationIntervalDays, record.provider);
    const now = this.nowProvider();
    const expiresDate = expiresAt ? new Date(expiresAt) : record.expiresAt;
    if (expiresDate && !Number.isFinite(expiresDate.getTime())) {
      throw Object.assign(new Error('Expiry date is invalid'), { status: 422 });
    }

    const newHash = this.encryptionService.hash(trimmedKey);
    if (newHash === record.keyHash) {
      throw Object.assign(new Error('New API key matches the existing key'), { status: 409 });
    }

    const encrypted = this.encryptionService.encryptStructured(
      { secret: trimmedKey },
      {
        classificationTag: record.classificationTag ?? 'integration-secret',
        keyId: record.encryptionKeyId,
        fingerprintValues: [record.provider, record.environment, record.alias, trimmedKey.slice(-8)]
      }
    );

    const rotationEntry = {
      rotatedAt: now.toISOString(),
      rotatedBy: rotatedBy ?? record.metadata?.lastRotatedBy ?? record.ownerEmail,
      reason: reason ?? 'manual-rotation'
    };

    const existingHistory = Array.isArray(record.metadata?.rotationHistory)
      ? record.metadata.rotationHistory
      : [];
    const rotationHistory = [rotationEntry, ...existingHistory].slice(0, 20);

    const updatedMetadata = {
      ...record.metadata,
      rotationHistory,
      lastRotatedBy: rotationEntry.rotatedBy,
      notes: notes ?? record.metadata?.notes ?? null
    };

    const nextRotationAt = addDays(now, rotationDays);

    const updateArgs = [
      id,
      {
        lastFour: trimmedKey.slice(-4),
        keyHash: newHash,
        encryptedKey: encrypted.ciphertext,
        encryptionKeyId: encrypted.keyId,
        rotationIntervalDays: rotationDays,
        lastRotatedAt: now,
        nextRotationAt,
        expiresAt: expiresDate,
        status: 'active',
        metadata: updatedMetadata,
        updatedBy: rotatedBy ?? record.metadata?.lastRotatedBy ?? record.ownerEmail
      }
    ];

    if (connection !== undefined) {
      updateArgs.push(connection);
    }

    const updated = await this.model.updateById(...updateArgs);

    return this.sanitize(updated);
  }

  async disableKey(id, { disabledBy, reason }, { connection } = {}) {
    const record = await this.model.findById(id, connection);
    if (!record) {
      throw Object.assign(new Error('API key not found'), { status: 404 });
    }

    if (record.disabledAt) {
      return this.sanitize(record);
    }

    const now = this.nowProvider();
    const updatedMetadata = {
      ...record.metadata,
      disabledReason: reason ?? record.metadata?.disabledReason ?? null,
      disabledBy: disabledBy ?? record.metadata?.disabledBy ?? null
    };

    const disableArgs = [
      id,
      {
        status: 'disabled',
        disabledAt: now,
        metadata: updatedMetadata,
        updatedBy: disabledBy ?? record.metadata?.lastRotatedBy ?? record.ownerEmail
      }
    ];

    if (connection !== undefined) {
      disableArgs.push(connection);
    }

    const updated = await this.model.updateById(...disableArgs);

    return this.sanitize(updated);
  }

  summarizeForAudit(record, { includeSecret = false } = {}) {
    const sanitized = this.sanitize(record);
    if (!sanitized) {
      return null;
    }

    return {
      id: sanitized.id,
      provider: sanitized.provider,
      environment: sanitized.environment,
      alias: sanitized.alias,
      ownerEmail: sanitized.ownerEmail,
      lastFour: sanitized.lastFour,
      status: sanitized.status,
      rotationStatus: sanitized.rotationStatus,
      nextRotationAt: sanitized.nextRotationAt,
      expiresAt: sanitized.expiresAt,
      fingerprint: buildAuditFingerprint(sanitized),
      riskLevel: deriveRiskLevel(sanitized),
      rotationCount: sanitized.metadata.rotationCount,
      notes: sanitized.metadata.notes,
      ...(includeSecret ? { encryptedKey: record?.encryptedKey ?? null } : {})
    };
  }

  buildRotationPlan(record) {
    const sanitized = this.sanitize(record);
    if (!sanitized) {
      return null;
    }

    const history = Array.isArray(record?.metadata?.rotationHistory)
      ? record.metadata.rotationHistory
      : [];

    const lastRotation = history[0] ?? null;
    const previousRotation = history[1] ?? null;

    return {
      keyId: sanitized.id,
      provider: sanitized.provider,
      environment: sanitized.environment,
      rotationIntervalDays: sanitized.rotationIntervalDays,
      status: sanitized.status,
      rotationStatus: sanitized.rotationStatus,
      lastRotation,
      previousRotation,
      nextRotationAt: sanitized.nextRotationAt,
      suggestedRotationAt: sanitized.nextRotationAt,
      riskLevel: deriveRiskLevel(sanitized)
    };
  }

  async generateAuditReport({ filters = {}, includeDisabled = false } = {}) {
    const records = await this.model.list(filters);
    return records
      .filter((record) => includeDisabled || !record.disabledAt)
      .map((record) => this.summarizeForAudit(record));
  }
}

