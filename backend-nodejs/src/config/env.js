import crypto from 'crypto';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

function tryParseJson(value) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  try {
    return JSON.parse(trimmed);
  } catch (_jsonError) {
    try {
      const decoded = Buffer.from(trimmed, 'base64').toString('utf8');
      return JSON.parse(decoded);
    } catch (_base64Error) {
      return null;
    }
  }
}

function normalizeJwtKeyset(rawKeyset, fallbackSecret, explicitActiveKeyId) {
  const allowedAlgorithms = new Set(['HS256', 'HS384', 'HS512']);
  const keysetSource = tryParseJson(rawKeyset);

  if (!keysetSource) {
    if (!fallbackSecret) {
      throw new Error(
        'JWT configuration invalid: provide either JWT_KEYSET (JSON/base64 JSON) or a legacy JWT_SECRET value.'
      );
    }

    const legacyKey = {
      kid: 'legacy-env-secret',
      secret: fallbackSecret,
      algorithm: 'HS512',
      status: 'active',
      createdAt: new Date().toISOString()
    };

    return {
      activeKeyId: legacyKey.kid,
      keys: [legacyKey]
    };
  }

  const keys = Array.isArray(keysetSource) ? keysetSource : keysetSource.keys ?? [];
  const configuredActiveKeyId =
    explicitActiveKeyId ?? keysetSource.activeKeyId ?? keysetSource.active_key_id ?? null;

  if (!Array.isArray(keys) || keys.length === 0) {
    throw new Error('JWT_KEYSET must contain at least one signing key definition.');
  }

  const normalizedKeys = keys.map((key) => {
    if (!key.kid || typeof key.kid !== 'string') {
      throw new Error('Every JWT key must declare a non-empty "kid" string.');
    }

    if (!key.secret || typeof key.secret !== 'string' || key.secret.length < 32) {
      throw new Error(`Signing secret for key "${key.kid}" must be a string with >= 32 characters.`);
    }

    const algorithm = (key.algorithm ?? 'HS512').toUpperCase();
    if (!allowedAlgorithms.has(algorithm)) {
      throw new Error(
        `Unsupported algorithm "${algorithm}" for key "${key.kid}". Allowed values: ${Array.from(allowedAlgorithms).join(', ')}`
      );
    }

    const status = key.status ?? 'active';
    return {
      kid: key.kid,
      secret: key.secret,
      algorithm,
      status,
      createdAt: key.createdAt ?? key.created_at ?? null,
      rotatedAt: key.rotatedAt ?? key.rotated_at ?? null
    };
  });

  const activeKey =
    normalizedKeys.find((key) => key.kid === configuredActiveKeyId) ??
    normalizedKeys.find((key) => key.status === 'active');

  if (!activeKey) {
    throw new Error('JWT configuration invalid: no active signing key available.');
  }

  return {
    activeKeyId: activeKey.kid,
    keys: normalizedKeys
  };
}

function parseCsv(value) {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseEncryptionFallbackKeys(value) {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry, index) => {
      const [keyId, ...secretParts] = entry.split(':');
      const secret = secretParts.join(':').trim();
      if (!keyId || !secret) {
        throw new Error(
          `Invalid DATA_ENCRYPTION_FALLBACK_KEYS entry at position ${index}. Expected "keyId:secret".`
        );
      }
      return { keyId: keyId.trim(), secret };
    });
}

function normalizePrefix(value, fallback = '') {
  const source = (value ?? fallback ?? '').trim();
  if (!source) {
    return fallback ?? '';
  }

  return source.replace(/^\/+/, '').replace(/\/+$/, '');
}

function clampRate(rate) {
  if (typeof rate !== 'number' || Number.isNaN(rate)) {
    return 0;
  }

  const normalised = rate > 1 ? rate / 100 : rate;
  if (normalised < 0) {
    return 0;
  }

  if (normalised > 1) {
    return 1;
  }

  return Number(normalised.toFixed(6));
}

function maybeDecodeCertificate(value) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.includes('-----BEGIN')) {
    return trimmed;
  }

  try {
    return Buffer.from(trimmed, 'base64').toString('utf8');
  } catch (_error) {
    return trimmed;
  }
}

function normalizeRedisNamespace(value, fallback) {
  const source = (value ?? fallback ?? '').trim();
  if (!source) {
    return fallback ?? '';
  }

  return source.replace(/:+$/, '');
}

function buildRedisKey(prefix, key) {
  const base = normalizeRedisNamespace(prefix, 'edulure');
  const suffix = String(key ?? '')
    .trim()
    .replace(/^:+/, '')
    .replace(/:+$/, '');

  if (!suffix) {
    return base;
  }

  return `${base}:${suffix}`;
}

function normalizeTaxTable(rawTable) {
  if (!rawTable || typeof rawTable !== 'object') {
    return {};
  }

  return Object.entries(rawTable).reduce((acc, [countryCode, config]) => {
    const upperCountry = countryCode.trim().toUpperCase();
    if (!upperCountry) {
      return acc;
    }

    let defaultRate = 0;
    let regions = {};
    if (typeof config === 'number') {
      defaultRate = clampRate(config);
    } else if (typeof config === 'object' && config !== null) {
      defaultRate = clampRate(config.defaultRate ?? config.default_rate ?? 0);
      const rawRegions = config.regions ?? config.subdivisions ?? {};
      regions = Object.entries(rawRegions).reduce((regionAcc, [regionCode, regionRate]) => {
        const upperRegion = regionCode.trim().toUpperCase();
        if (!upperRegion) {
          return regionAcc;
        }

        regionAcc[upperRegion] = clampRate(regionRate);
        return regionAcc;
      }, {});
    }

    acc[upperCountry] = {
      defaultRate,
      regions
    };

    return acc;
  }, {});
}

function normalizeStatementDescriptor(descriptor) {
  if (!descriptor) {
    return null;
  }

  const sanitized = descriptor.replace(/[^a-zA-Z0-9 .]/g, '').substring(0, 22).trim();
  return sanitized ? sanitized.toUpperCase() : null;
}

function normalizeHost(value) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    throw new Error(`Invalid Meilisearch host "${value}" – hosts must include http(s):// prefix.`);
  }

  return trimmed.replace(/\/+$/, '');
}

function parseHostList(value, { allowEmpty = false } = {}) {
  const hosts = parseCsv(value ?? '')
    .map(normalizeHost)
    .filter(Boolean);

  if (!hosts.length && !allowEmpty) {
    throw new Error('At least one Meilisearch host must be configured.');
  }

  return Array.from(new Set(hosts));
}

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    WEB_PORT: z.coerce.number().int().min(1).max(65535).optional(),
    WEB_PROBE_PORT: z.coerce.number().int().min(1).max(65535).optional(),
    WORKER_PROBE_PORT: z.coerce.number().int().min(1).max(65535).default(9091),
    REALTIME_PORT: z.coerce.number().int().min(1).max(65535).default(4100),
    REALTIME_PROBE_PORT: z.coerce.number().int().min(1).max(65535).optional(),
    APP_NAME: z.string().min(1).default('Edulure'),
    APP_URL: z.string().min(1, 'APP_URL must specify at least one origin'),
    CORS_ALLOWED_ORIGINS: z.string().optional(),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    JWT_SECRET: z.string().min(32).optional(),
    TWO_FACTOR_ENCRYPTION_KEY: z.string().min(32).optional(),
    TWO_FACTOR_REQUIRED_ROLES: z.string().optional(),
    TWO_FACTOR_ISSUER: z.string().optional(),
    TWO_FACTOR_DIGITS: z.coerce.number().int().min(6).max(10).default(6),
    TWO_FACTOR_STEP_SECONDS: z.coerce.number().int().min(15).max(120).default(30),
    TWO_FACTOR_WINDOW: z.coerce.number().int().min(0).max(2).default(1),
    DATA_ENCRYPTION_PRIMARY_KEY: z.string().min(32).optional(),
    DATA_ENCRYPTION_ACTIVE_KEY_ID: z.string().min(2).optional(),
    DATA_ENCRYPTION_FALLBACK_KEYS: z.string().optional(),
    DATA_ENCRYPTION_DEFAULT_CLASSIFICATION: z.string().min(3).optional(),
    JWT_REFRESH_SECRET: z
      .string()
      .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters to provide adequate entropy'),
    JWT_KEYSET: z.string().optional(),
    JWT_ACTIVE_KEY_ID: z.string().optional(),
    JWT_AUDIENCE: z.string().optional(),
    JWT_ISSUER: z.string().optional(),
    TOKEN_EXPIRY_MINUTES: z.coerce.number().int().min(5).max(24 * 60).default(120),
    REFRESH_TOKEN_EXPIRY_DAYS: z.coerce.number().int().min(1).max(180).default(30),
    DB_HOST: z.string().min(1),
    DB_PORT: z.coerce.number().int().min(1).max(65535).default(3306),
    DB_USER: z.string().min(1),
    DB_PASSWORD: z.string().min(1),
    DB_NAME: z.string().min(1),
    DB_POOL_MIN: z.coerce.number().int().min(0).default(2),
    DB_POOL_MAX: z.coerce.number().int().min(2).default(10),
    RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().int().min(1).max(60).default(15),
    RATE_LIMIT_MAX: z.coerce.number().int().min(25).max(2000).default(300),
    SESSION_VALIDATION_CACHE_TTL_MS: z.coerce.number().int().min(1000).max(10 * 60 * 1000).default(60000),
    MAX_ACTIVE_SESSIONS_PER_USER: z.coerce.number().int().min(1).max(50).default(10),
    METRICS_ENABLED: z.coerce.boolean().default(true),
    METRICS_USERNAME: z.string().min(3).optional(),
    METRICS_PASSWORD: z.string().min(8).optional(),
    METRICS_BEARER_TOKEN: z.string().min(16).optional(),
    METRICS_ALLOWED_IPS: z.string().optional(),
    TRACE_HEADER_NAME: z.string().min(3).default('x-request-id'),
    TRACING_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0.25),
    R2_ACCOUNT_ID: z.string().min(1),
    R2_ACCESS_KEY_ID: z.string().min(1),
    R2_SECRET_ACCESS_KEY: z.string().min(1),
    R2_REGION: z.string().min(1).default('auto'),
    R2_PUBLIC_BUCKET: z.string().min(1),
    R2_PRIVATE_BUCKET: z.string().min(1),
    R2_UPLOADS_BUCKET: z.string().min(1),
    R2_QUARANTINE_BUCKET: z.string().min(1),
    R2_CDN_URL: z.string().url().optional(),
    ANTIVIRUS_ENABLED: z.coerce.boolean().default(true),
    ANTIVIRUS_HOST: z.string().min(1).default('127.0.0.1'),
    ANTIVIRUS_PORT: z.coerce.number().int().min(1).max(65535).default(3310),
    ANTIVIRUS_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .min(1000)
      .max(600000)
      .default(20000),
    ANTIVIRUS_MAX_FILE_SIZE_MB: z.coerce.number().int().min(1).max(2048).default(500),
    ANTIVIRUS_FAIL_OPEN: z.coerce.boolean().default(false),
    ANTIVIRUS_CACHE_TTL_SECONDS: z.coerce.number().int().min(0).max(86400).default(300),
    ANTIVIRUS_SKIP_TAG: z.string().min(1).default('edulure-skip-scan'),
    ASSET_PRESIGN_TTL_MINUTES: z.coerce.number().int().min(5).max(60).default(15),
    ASSET_DOWNLOAD_TTL_MINUTES: z.coerce.number().int().min(5).max(1440).default(60),
    CONTENT_MAX_UPLOAD_MB: z.coerce.number().int().min(10).max(2048).default(512),
    CLOUDCONVERT_API_KEY: z.string().min(1).optional(),
    HUBSPOT_ENABLED: z.coerce.boolean().default(false),
    HUBSPOT_PRIVATE_APP_TOKEN: z.string().min(20).optional(),
    HUBSPOT_BASE_URL: z.string().url().default('https://api.hubapi.com'),
    HUBSPOT_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60000).default(12000),
    HUBSPOT_MAX_RETRIES: z.coerce.number().int().min(0).max(6).default(3),
    HUBSPOT_SYNC_WINDOW_MINUTES: z.coerce.number().int().min(15).max(720).default(90),
    SALESFORCE_ENABLED: z.coerce.boolean().default(false),
    SALESFORCE_LOGIN_URL: z.string().url().default('https://login.salesforce.com'),
    SALESFORCE_CLIENT_ID: z.string().min(5).optional(),
    SALESFORCE_CLIENT_SECRET: z.string().min(5).optional(),
    SALESFORCE_USERNAME: z.string().min(3).optional(),
    SALESFORCE_PASSWORD: z.string().min(6).optional(),
    SALESFORCE_SECURITY_TOKEN: z.string().optional(),
    SALESFORCE_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60000).default(12000),
    SALESFORCE_MAX_RETRIES: z.coerce.number().int().min(0).max(6).default(3),
    SALESFORCE_EXTERNAL_ID_FIELD: z.string().min(3).default('Edulure_Project_Id__c'),
    CRM_HUBSPOT_SYNC_CRON: z.string().optional(),
    CRM_SALESFORCE_SYNC_CRON: z.string().optional(),
    CRM_RECONCILIATION_CRON: z.string().optional(),
    CRM_RECONCILIATION_WINDOW_DAYS: z.coerce.number().int().min(1).max(30).default(7),
    CRM_MAX_CONCURRENT_JOBS: z.coerce.number().int().min(1).max(5).default(1),
    INTEGRATION_KEY_INVITE_BASE_URL: z.string().url().optional(),
    INTEGRATION_KEY_INVITE_TTL_HOURS: z.coerce.number().int().min(1).max(24 * 30).default(48),
    WEBHOOK_BUS_ENABLED: z.coerce.boolean().default(true),
    WEBHOOK_BUS_POLL_INTERVAL_MS: z.coerce.number().int().min(100).max(60000).default(2000),
    WEBHOOK_BUS_BATCH_SIZE: z.coerce.number().int().min(1).max(200).default(25),
    WEBHOOK_BUS_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(20).default(6),
    WEBHOOK_BUS_INITIAL_BACKOFF_SECONDS: z.coerce.number().int().min(5).max(3600).default(60),
    WEBHOOK_BUS_MAX_BACKOFF_SECONDS: z.coerce.number().int().min(30).max(24 * 60 * 60).default(1800),
    WEBHOOK_BUS_DELIVERY_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60000).default(5000),
    WEBHOOK_BUS_RECOVER_AFTER_MS: z.coerce.number().int().min(60 * 1000).max(6 * 60 * 60 * 1000).default(5 * 60 * 1000),
    DRM_DOWNLOAD_LIMIT: z.coerce.number().int().min(1).max(10).default(3),
    DRM_SIGNATURE_SECRET: z.string().min(32).optional(),
    STRIPE_SECRET_KEY: z.string().min(10),
    STRIPE_PUBLISHABLE_KEY: z.string().min(10).optional(),
    STRIPE_WEBHOOK_SECRET: z.string().min(10).optional(),
    STRIPE_STATEMENT_DESCRIPTOR: z.string().min(5).max(22).optional(),
    ESCROW_API_KEY: z.string().min(1).optional(),
    ESCROW_API_SECRET: z.string().min(1).optional(),
    ESCROW_BASE_URL: z.string().url().optional(),
    ESCROW_WEBHOOK_SECRET: z.string().min(1).optional(),
    PAYPAL_CLIENT_ID: z.string().min(10),
    PAYPAL_CLIENT_SECRET: z.string().min(10),
    PAYPAL_ENVIRONMENT: z.enum(['sandbox', 'live']).default('sandbox'),
    PAYPAL_WEBHOOK_ID: z.string().min(10).optional(),
    PAYMENTS_DEFAULT_CURRENCY: z.string().length(3).default('USD'),
    PAYMENTS_ALLOWED_CURRENCIES: z.string().optional(),
    PAYMENTS_TAX_TABLE: z.string().optional(),
    PAYMENTS_TAX_INCLUSIVE: z.coerce.boolean().default(false),
    PAYMENTS_MINIMUM_TAX_RATE: z.coerce.number().min(0).max(1).default(0),
    PAYMENTS_MAX_COUPON_PERCENTAGE: z.coerce.number().min(0).max(100).default(80),
    PAYMENTS_REPORTING_TIMEZONE: z.string().default('Etc/UTC'),
    SMTP_HOST: z.string().min(1),
    SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
    SMTP_SECURE: z.coerce.boolean().default(false),
    SMTP_USER: z.string().min(1),
    SMTP_PASSWORD: z.string().min(1),
    SMTP_FROM_EMAIL: z.string().email(),
    SMTP_FROM_NAME: z.string().min(1),
    EMAIL_VERIFICATION_URL: z.string().url(),
    EMAIL_VERIFICATION_TOKEN_TTL_MINUTES: z.coerce.number().int().min(15).max(24 * 60).default(60),
    EMAIL_VERIFICATION_RESEND_COOLDOWN_MINUTES: z
      .coerce.number()
      .int()
      .min(1)
      .max(24 * 60)
      .default(15),
    ACCOUNT_LOCKOUT_THRESHOLD: z.coerce.number().int().min(3).max(20).default(5),
    ACCOUNT_LOCKOUT_WINDOW_MINUTES: z.coerce.number().int().min(5).max(24 * 60).default(15),
    ACCOUNT_LOCKOUT_DURATION_MINUTES: z.coerce.number().int().min(5).max(24 * 60).default(30),
    DATA_RETENTION_ENABLED: z.coerce.boolean().default(true),
    DATA_RETENTION_CRON: z.string().default('0 3 * * *'),
    DATA_RETENTION_TIMEZONE: z.string().default('Etc/UTC'),
    DATA_RETENTION_DRY_RUN: z.coerce.boolean().default(false),
    DATA_RETENTION_RUN_ON_STARTUP: z.coerce.boolean().default(false),
    DATA_RETENTION_MAX_FAILURES: z.coerce.number().int().min(1).max(10).default(3),
    DATA_RETENTION_FAILURE_BACKOFF_MINUTES: z.coerce.number().int().min(5).max(24 * 60).default(30),
    DATA_PARTITIONING_ENABLED: z.coerce.boolean().default(true),
    DATA_PARTITIONING_SCHEMA: z.string().optional(),
    DATA_PARTITIONING_CRON: z.string().default('30 2 * * *'),
    DATA_PARTITIONING_TIMEZONE: z.string().default('Etc/UTC'),
    DATA_PARTITIONING_DRY_RUN: z.coerce.boolean().default(false),
    DATA_PARTITIONING_RUN_ON_STARTUP: z.coerce.boolean().default(false),
    DATA_PARTITIONING_LOOKAHEAD_MONTHS: z.coerce.number().int().min(1).max(18).default(6),
    DATA_PARTITIONING_LOOKBEHIND_MONTHS: z.coerce.number().int().min(0).max(12).default(1),
    DATA_PARTITIONING_MIN_ACTIVE_PARTITIONS: z.coerce.number().int().min(1).max(24).default(3),
    DATA_PARTITIONING_ARCHIVE_GRACE_DAYS: z.coerce.number().int().min(0).max(180).default(45),
    DATA_PARTITIONING_ARCHIVE_BUCKET: z.string().optional(),
    DATA_PARTITIONING_ARCHIVE_PREFIX: z.string().optional(),
    DATA_PARTITIONING_ARCHIVE_COMPRESS: z.coerce.boolean().default(false),
    DATA_PARTITIONING_EXPORT_BATCH_SIZE: z.coerce.number().int().min(500).max(50000).default(5000),
    DATA_PARTITIONING_MAX_EXPORT_ROWS: z.coerce.number().int().min(1000).max(1000000).optional(),
    DATA_PARTITIONING_MAX_EXPORT_MB: z.coerce.number().min(1).max(1024).optional(),
    DATA_PARTITIONING_MAX_FAILURES: z.coerce.number().int().min(1).max(10).default(3),
    DATA_PARTITIONING_FAILURE_BACKOFF_MINUTES: z.coerce.number().int().min(5).max(24 * 60).default(60),
    DOMAIN_EVENTS_DISPATCH_ENABLED: z.coerce.boolean().default(true),
    DOMAIN_EVENTS_DISPATCH_POLL_INTERVAL_MS: z
      .coerce.number()
      .int()
      .min(200)
      .max(60 * 1000)
      .default(2000),
    DOMAIN_EVENTS_DISPATCH_BATCH_SIZE: z.coerce.number().int().min(1).max(500).default(50),
    DOMAIN_EVENTS_DISPATCH_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(20).default(8),
    DOMAIN_EVENTS_DISPATCH_INITIAL_BACKOFF_SECONDS: z
      .coerce.number()
      .int()
      .min(5)
      .max(3600)
      .default(30),
    DOMAIN_EVENTS_DISPATCH_MAX_BACKOFF_SECONDS: z
      .coerce.number()
      .int()
      .min(30)
      .max(7200)
      .default(900),
    DOMAIN_EVENTS_DISPATCH_BACKOFF_MULTIPLIER: z
      .coerce.number()
      .min(1)
      .max(10)
      .default(2),
    DOMAIN_EVENTS_DISPATCH_JITTER_RATIO: z
      .coerce.number()
      .min(0)
      .max(0.5)
      .default(0.15),
    DOMAIN_EVENTS_DISPATCH_RECOVER_INTERVAL_MS: z
      .coerce.number()
      .int()
      .min(5000)
      .max(10 * 60 * 1000)
      .default(60000),
    DOMAIN_EVENTS_DISPATCH_RECOVER_TIMEOUT_MINUTES: z
      .coerce.number()
      .int()
      .min(1)
      .max(120)
      .default(10),
    REDIS_ENABLED: z.coerce.boolean().default(false),
    REDIS_URL: z.string().url().optional(),
    REDIS_HOST: z.string().min(1).default('127.0.0.1'),
    REDIS_PORT: z.coerce.number().int().min(1).max(65535).default(6379),
    REDIS_USERNAME: z.string().min(1).optional(),
    REDIS_PASSWORD: z.string().min(1).optional(),
    REDIS_TLS_ENABLED: z.coerce.boolean().default(false),
    REDIS_TLS_CA: z.string().optional(),
    REDIS_KEY_PREFIX: z.string().min(1).default('edulure:runtime'),
    REDIS_LOCK_PREFIX: z.string().min(1).default('edulure:locks'),
    REDIS_FEATURE_FLAG_CACHE_KEY: z.string().min(1).default('feature-flags'),
    REDIS_RUNTIME_CONFIG_CACHE_KEY: z.string().min(1).default('runtime-config'),
    REDIS_FEATURE_FLAG_LOCK_KEY: z.string().min(1).default('feature-flags'),
    REDIS_RUNTIME_CONFIG_LOCK_KEY: z.string().min(1).default('runtime-config'),
    REDIS_COMMAND_TIMEOUT_MS: z.coerce.number().int().min(50).max(60000).default(2000),
    REDIS_LOCK_TTL_SECONDS: z.coerce.number().int().min(5).max(600).default(45),
    FEATURE_FLAG_CACHE_TTL_SECONDS: z.coerce.number().int().min(5).max(10 * 60).default(30),
    FEATURE_FLAG_REFRESH_INTERVAL_SECONDS: z.coerce.number().int().min(15).max(24 * 60 * 60).default(120),
    RUNTIME_CONFIG_CACHE_TTL_SECONDS: z.coerce.number().int().min(5).max(10 * 60).default(45),
    RUNTIME_CONFIG_REFRESH_INTERVAL_SECONDS: z.coerce.number().int().min(15).max(24 * 60 * 60).default(300),
    COMMUNITY_DEFAULT_TIMEZONE: z.string().default('Etc/UTC'),
    COMMUNITY_REMINDER_ENABLED: z.coerce.boolean().default(true),
    COMMUNITY_REMINDER_CRON: z.string().default('*/5 * * * *'),
    COMMUNITY_REMINDER_TIMEZONE: z.string().default('Etc/UTC'),
    COMMUNITY_REMINDER_LOOKAHEAD_MINUTES: z.coerce.number().int().min(1).max(24 * 60).default(30),
    COMMUNITY_REMINDER_BATCH_SIZE: z.coerce.number().int().min(1).max(500).default(100),
    CHAT_PRESENCE_DEFAULT_TTL_MINUTES: z.coerce.number().int().min(1).max(24 * 60).default(5),
    CHAT_PRESENCE_MAX_TTL_MINUTES: z.coerce.number().int().min(5).max(24 * 60).default(60),
    CHAT_MESSAGE_DEFAULT_PAGE_SIZE: z.coerce.number().int().min(10).max(500).default(50),
    CHAT_MESSAGE_MAX_PAGE_SIZE: z.coerce.number().int().min(10).max(500).default(200),
    DM_THREAD_DEFAULT_PAGE_SIZE: z.coerce.number().int().min(5).max(200).default(20),
    DM_THREAD_MAX_PAGE_SIZE: z.coerce.number().int().min(10).max(500).default(100),
    DM_MESSAGE_DEFAULT_PAGE_SIZE: z.coerce.number().int().min(10).max(500).default(50),
    DM_MESSAGE_MAX_PAGE_SIZE: z.coerce.number().int().min(10).max(500).default(200),
    SOCIAL_FOLLOW_DEFAULT_PAGE_SIZE: z.coerce.number().int().min(5).max(200).default(25),
    SOCIAL_FOLLOW_MAX_PAGE_SIZE: z.coerce.number().int().min(10).max(500).default(100),
    SOCIAL_RECOMMENDATION_MAX_RESULTS: z.coerce.number().int().min(1).max(100).default(12),
    SOCIAL_RECOMMENDATION_REFRESH_MINUTES: z.coerce.number().int().min(5).max(24 * 60 * 7).default(360),
    SOCIAL_MUTE_DEFAULT_DURATION_DAYS: z.coerce.number().int().min(1).max(365).default(30),
    MEILISEARCH_HOSTS: z.string().min(1),
    MEILISEARCH_REPLICA_HOSTS: z.string().optional(),
    MEILISEARCH_SEARCH_HOSTS: z.string().optional(),
    MEILISEARCH_ADMIN_API_KEY: z.string().min(16),
    MEILISEARCH_SEARCH_API_KEY: z.string().min(16),
    MEILISEARCH_HEALTHCHECK_INTERVAL_SECONDS: z.coerce
      .number()
      .int()
      .min(10)
      .max(3600)
      .default(30),
    MEILISEARCH_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(500).max(60000).default(5000),
    MEILISEARCH_INDEX_PREFIX: z
      .string()
      .regex(/^[a-z0-9_-]+$/i, 'MEILISEARCH_INDEX_PREFIX may only contain letters, numbers, underscores, and dashes.')
      .optional(),
    MEILISEARCH_ALLOWED_IPS: z.string().optional(),
    SEARCH_INGESTION_BATCH_SIZE: z.coerce.number().int().min(25).max(2000).default(500),
    SEARCH_INGESTION_CONCURRENCY: z.coerce.number().int().min(1).max(8).default(2),
    SEARCH_INGESTION_DELETE_BEFORE_REINDEX: z.coerce.boolean().default(true),
    BOOTSTRAP_MAX_RETRIES: z.coerce.number().int().min(1).max(10).default(5),
    BOOTSTRAP_RETRY_DELAY_MS: z.coerce.number().int().min(100).max(60000).default(2000)
  })
  .superRefine((value, ctx) => {
    if (value.DB_POOL_MIN > value.DB_POOL_MAX) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['DB_POOL_MIN'],
        message: 'DB_POOL_MIN cannot exceed DB_POOL_MAX'
      });
    }

    if (!value.JWT_SECRET && !value.JWT_KEYSET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_SECRET'],
        message: 'Provide either JWT_SECRET or JWT_KEYSET to sign access tokens.'
      });
    }

    if ((value.METRICS_USERNAME && !value.METRICS_PASSWORD) || (!value.METRICS_USERNAME && value.METRICS_PASSWORD)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['METRICS_USERNAME'],
        message: 'METRICS_USERNAME and METRICS_PASSWORD must be configured together.'
      });
    }

    if (value.METRICS_BEARER_TOKEN && (value.METRICS_USERNAME || value.METRICS_PASSWORD)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['METRICS_BEARER_TOKEN'],
        message: 'Use either METRICS_BEARER_TOKEN or METRICS_USERNAME/METRICS_PASSWORD, not both.'
      });
    }

    if (!value.REDIS_TLS_ENABLED && value.REDIS_TLS_CA) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['REDIS_TLS_CA'],
        message: 'Provide REDIS_TLS_CA only when REDIS_TLS_ENABLED is true.'
      });
    }

    if ((value.ESCROW_API_KEY && !value.ESCROW_API_SECRET) || (!value.ESCROW_API_KEY && value.ESCROW_API_SECRET)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ESCROW_API_KEY'],
        message: 'ESCROW_API_KEY and ESCROW_API_SECRET must be configured together.'
      });
    }

    if (value.CHAT_PRESENCE_DEFAULT_TTL_MINUTES > value.CHAT_PRESENCE_MAX_TTL_MINUTES) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['CHAT_PRESENCE_DEFAULT_TTL_MINUTES'],
        message: 'CHAT_PRESENCE_DEFAULT_TTL_MINUTES cannot exceed CHAT_PRESENCE_MAX_TTL_MINUTES.'
      });
    }

    if (value.CHAT_MESSAGE_DEFAULT_PAGE_SIZE > value.CHAT_MESSAGE_MAX_PAGE_SIZE) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['CHAT_MESSAGE_DEFAULT_PAGE_SIZE'],
        message: 'CHAT_MESSAGE_DEFAULT_PAGE_SIZE cannot exceed CHAT_MESSAGE_MAX_PAGE_SIZE.'
      });
    }

    if (value.DM_THREAD_DEFAULT_PAGE_SIZE > value.DM_THREAD_MAX_PAGE_SIZE) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['DM_THREAD_DEFAULT_PAGE_SIZE'],
        message: 'DM_THREAD_DEFAULT_PAGE_SIZE cannot exceed DM_THREAD_MAX_PAGE_SIZE.'
      });
    }

    if (value.DM_MESSAGE_DEFAULT_PAGE_SIZE > value.DM_MESSAGE_MAX_PAGE_SIZE) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['DM_MESSAGE_DEFAULT_PAGE_SIZE'],
        message: 'DM_MESSAGE_DEFAULT_PAGE_SIZE cannot exceed DM_MESSAGE_MAX_PAGE_SIZE.'
      });
    }

    if (value.SOCIAL_FOLLOW_DEFAULT_PAGE_SIZE > value.SOCIAL_FOLLOW_MAX_PAGE_SIZE) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['SOCIAL_FOLLOW_DEFAULT_PAGE_SIZE'],
        message: 'SOCIAL_FOLLOW_DEFAULT_PAGE_SIZE cannot exceed SOCIAL_FOLLOW_MAX_PAGE_SIZE.'
      });
    }

    if (value.MEILISEARCH_ADMIN_API_KEY === value.MEILISEARCH_SEARCH_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['MEILISEARCH_SEARCH_API_KEY'],
        message: 'MEILISEARCH_SEARCH_API_KEY must be different from the admin API key.'
      });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration', parsed.error.flatten().fieldErrors);
  throw new Error('Environment validation failed. Check .env configuration.');
}

const raw = parsed.data;

let meilisearchHosts;
let meilisearchReplicaHosts;
let meilisearchSearchHosts;

try {
  meilisearchHosts = parseHostList(raw.MEILISEARCH_HOSTS);
  meilisearchReplicaHosts = parseHostList(raw.MEILISEARCH_REPLICA_HOSTS, { allowEmpty: true });
  meilisearchSearchHosts = parseHostList(
    raw.MEILISEARCH_SEARCH_HOSTS ?? `${raw.MEILISEARCH_HOSTS},${raw.MEILISEARCH_REPLICA_HOSTS ?? ''}`,
    { allowEmpty: false }
  );
} catch (error) {
  console.error('Invalid Meilisearch host configuration', error.message);
  throw error;
}

const defaultCurrency = raw.PAYMENTS_DEFAULT_CURRENCY.toUpperCase();
const allowedCurrencies = Array.from(
  new Set([
    defaultCurrency,
    ...parseCsv(raw.PAYMENTS_ALLOWED_CURRENCIES ?? '').map((currency) => currency.toUpperCase())
  ])
);
const taxTable = normalizeTaxTable(tryParseJson(raw.PAYMENTS_TAX_TABLE));
const statementDescriptor =
  normalizeStatementDescriptor(raw.STRIPE_STATEMENT_DESCRIPTOR) ?? 'EDULURE LEARNING';

const jwtKeyset = normalizeJwtKeyset(raw.JWT_KEYSET, raw.JWT_SECRET, raw.JWT_ACTIVE_KEY_ID);
const activeJwtKey = jwtKeyset.keys.find((key) => key.kid === jwtKeyset.activeKeyId);

const corsOrigins = (raw.CORS_ALLOWED_ORIGINS ?? raw.APP_URL)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const metricsAllowedIps = parseCsv(raw.METRICS_ALLOWED_IPS ?? '');
const redactedFields = parseCsv(raw.LOG_REDACTED_FIELDS ?? '');
const searchAllowedIps = parseCsv(raw.MEILISEARCH_ALLOWED_IPS ?? '');
const configuredTwoFactorRoles = parseCsv(raw.TWO_FACTOR_REQUIRED_ROLES ?? '');
const twoFactorRequiredRoles = (configuredTwoFactorRoles.length > 0
  ? configuredTwoFactorRoles
  : ['admin']
).map((role) => role.toLowerCase());
const twoFactorEncryptionSource = raw.TWO_FACTOR_ENCRYPTION_KEY ?? raw.JWT_REFRESH_SECRET;
const twoFactorEncryptionKey = crypto.createHash('sha256').update(twoFactorEncryptionSource).digest();
const twoFactorIssuer = raw.TWO_FACTOR_ISSUER ?? raw.APP_NAME ?? 'Edulure';

const dataEncryptionActiveKeyId = raw.DATA_ENCRYPTION_ACTIVE_KEY_ID ?? 'v1';
const dataEncryptionPrimarySecret = raw.DATA_ENCRYPTION_PRIMARY_KEY ?? raw.JWT_REFRESH_SECRET;
const dataEncryptionFallbackEntries = parseEncryptionFallbackKeys(raw.DATA_ENCRYPTION_FALLBACK_KEYS ?? '');
const dataEncryptionKeys = dataEncryptionFallbackEntries.reduce(
  (acc, entry) => {
    if (!acc[entry.keyId]) {
      acc[entry.keyId] = entry.secret;
    }
    return acc;
  },
  { [dataEncryptionActiveKeyId]: dataEncryptionPrimarySecret }
);
const dataEncryptionDefaultClassification = raw.DATA_ENCRYPTION_DEFAULT_CLASSIFICATION ?? 'general';

const webPort = raw.WEB_PORT ?? raw.PORT;
const webProbePort = raw.WEB_PROBE_PORT ?? webPort;
const workerProbePort = raw.WORKER_PROBE_PORT;
const realtimePort = raw.REALTIME_PORT;
const realtimeProbePort = raw.REALTIME_PROBE_PORT ?? realtimePort;
const redisKeyPrefix = normalizeRedisNamespace(raw.REDIS_KEY_PREFIX, 'edulure:runtime');
const redisLockPrefix = normalizeRedisNamespace(raw.REDIS_LOCK_PREFIX, 'edulure:locks');
const redisFeatureFlagKey = buildRedisKey(redisKeyPrefix, raw.REDIS_FEATURE_FLAG_CACHE_KEY);
const redisRuntimeConfigKey = buildRedisKey(redisKeyPrefix, raw.REDIS_RUNTIME_CONFIG_CACHE_KEY);
const redisFeatureFlagLockKey = buildRedisKey(redisLockPrefix, raw.REDIS_FEATURE_FLAG_LOCK_KEY);
const redisRuntimeConfigLockKey = buildRedisKey(redisLockPrefix, raw.REDIS_RUNTIME_CONFIG_LOCK_KEY);
const redisTlsCa = maybeDecodeCertificate(raw.REDIS_TLS_CA);
const partitionSchema = raw.DATA_PARTITIONING_SCHEMA ?? raw.DB_NAME;
const partitionArchiveBucket = raw.DATA_PARTITIONING_ARCHIVE_BUCKET ?? raw.R2_PRIVATE_BUCKET;
const partitionArchivePrefix = normalizePrefix(raw.DATA_PARTITIONING_ARCHIVE_PREFIX, 'archives/compliance');
const partitionMaxExportBytes = raw.DATA_PARTITIONING_MAX_EXPORT_MB
  ? raw.DATA_PARTITIONING_MAX_EXPORT_MB * 1024 * 1024
  : null;
const partitionMaxExportRows = raw.DATA_PARTITIONING_MAX_EXPORT_ROWS ?? null;

export const env = {
  nodeEnv: raw.NODE_ENV,
  isProduction: raw.NODE_ENV === 'production',
  isDevelopment: raw.NODE_ENV === 'development',
  app: {
    name: raw.APP_NAME,
    port: webPort,
    probePort: webProbePort,
    corsOrigins
  },
  services: {
    web: {
      port: webPort,
      probePort: webProbePort
    },
    worker: {
      probePort: workerProbePort
    },
    realtime: {
      port: realtimePort,
      probePort: realtimeProbePort
    }
  },
  video: {
    basePlaybackUrl: raw.VIDEO_BASE_URL ?? 'https://video.edulure.local/streams',
    tokenTtlMinutes: Number(raw.VIDEO_TOKEN_TTL_MINUTES ?? 90),
    liveEdgeLatencySeconds: Number(raw.VIDEO_LIVE_EDGE_LATENCY_SECONDS ?? 3)
  },
  security: {
    jwtRefreshSecret: raw.JWT_REFRESH_SECRET,
    accessTokenTtlMinutes: raw.TOKEN_EXPIRY_MINUTES,
    refreshTokenTtlDays: raw.REFRESH_TOKEN_EXPIRY_DAYS,
    rateLimitWindowMinutes: raw.RATE_LIMIT_WINDOW_MINUTES,
    rateLimitMax: raw.RATE_LIMIT_MAX,
    jwtKeyset: jwtKeyset.keys,
    jwtActiveKeyId: jwtKeyset.activeKeyId,
    jwtActiveKey: activeJwtKey,
    jwtAudience: raw.JWT_AUDIENCE ?? 'api.edulure.com',
    jwtIssuer: raw.JWT_ISSUER ?? 'edulure-platform',
    drmSignatureSecret: raw.DRM_SIGNATURE_SECRET ?? activeJwtKey.secret,
    accountLockoutThreshold: raw.ACCOUNT_LOCKOUT_THRESHOLD,
    accountLockoutWindowMinutes: raw.ACCOUNT_LOCKOUT_WINDOW_MINUTES,
    accountLockoutDurationMinutes: raw.ACCOUNT_LOCKOUT_DURATION_MINUTES,
    sessionValidationCacheTtlMs: raw.SESSION_VALIDATION_CACHE_TTL_MS,
    maxActiveSessionsPerUser: raw.MAX_ACTIVE_SESSIONS_PER_USER,
    dataEncryption: {
      activeKeyId: dataEncryptionActiveKeyId,
      keys: dataEncryptionKeys,
      defaultClassification: dataEncryptionDefaultClassification
    },
    twoFactor: {
      encryptionKey: twoFactorEncryptionKey,
      issuer: twoFactorIssuer,
      requiredRoles: twoFactorRequiredRoles,
      digits: raw.TWO_FACTOR_DIGITS,
      stepSeconds: raw.TWO_FACTOR_STEP_SECONDS,
      window: raw.TWO_FACTOR_WINDOW
    }
  },
  database: {
    host: raw.DB_HOST,
    port: raw.DB_PORT,
    user: raw.DB_USER,
    password: raw.DB_PASSWORD,
    name: raw.DB_NAME,
    poolMin: raw.DB_POOL_MIN,
    poolMax: raw.DB_POOL_MAX
  },
  storage: {
    accountId: raw.R2_ACCOUNT_ID,
    accessKeyId: raw.R2_ACCESS_KEY_ID,
    secretAccessKey: raw.R2_SECRET_ACCESS_KEY,
    region: raw.R2_REGION,
    publicBucket: raw.R2_PUBLIC_BUCKET,
    privateBucket: raw.R2_PRIVATE_BUCKET,
    uploadsBucket: raw.R2_UPLOADS_BUCKET,
    quarantineBucket: raw.R2_QUARANTINE_BUCKET,
    cdnUrl: raw.R2_CDN_URL,
    uploadTtlMinutes: raw.ASSET_PRESIGN_TTL_MINUTES,
    downloadTtlMinutes: raw.ASSET_DOWNLOAD_TTL_MINUTES,
    maxUploadBytes: raw.CONTENT_MAX_UPLOAD_MB * 1024 * 1024
  },
  antivirus: {
    enabled: raw.ANTIVIRUS_ENABLED,
    host: raw.ANTIVIRUS_HOST,
    port: raw.ANTIVIRUS_PORT,
    timeoutMs: raw.ANTIVIRUS_TIMEOUT_MS,
    maxFileSizeBytes: raw.ANTIVIRUS_MAX_FILE_SIZE_MB * 1024 * 1024,
    failOpen: raw.ANTIVIRUS_FAIL_OPEN,
    cacheTtlMs: raw.ANTIVIRUS_CACHE_TTL_SECONDS * 1000,
    skipMetadataTag: raw.ANTIVIRUS_SKIP_TAG,
    quarantineBucket: raw.R2_QUARANTINE_BUCKET
  },
  integrations: {
    cloudConvertApiKey: raw.CLOUDCONVERT_API_KEY ?? null,
    hubspot: {
      enabled: raw.HUBSPOT_ENABLED,
      accessToken: raw.HUBSPOT_PRIVATE_APP_TOKEN ?? null,
      baseUrl: raw.HUBSPOT_BASE_URL ?? 'https://api.hubapi.com',
      environment: raw.HUBSPOT_ENVIRONMENT ?? 'production',
      apiKeyAlias: raw.HUBSPOT_API_KEY_ALIAS ?? null,
      timeoutMs: raw.HUBSPOT_TIMEOUT_MS,
      maxRetries: raw.HUBSPOT_MAX_RETRIES,
      syncWindowMinutes: raw.HUBSPOT_SYNC_WINDOW_MINUTES
    },
    invites: {
      baseUrl: raw.INTEGRATION_KEY_INVITE_BASE_URL ?? raw.EMAIL_VERIFICATION_URL,
      tokenTtlHours: raw.INTEGRATION_KEY_INVITE_TTL_HOURS
    },
    salesforce: {
      enabled: raw.SALESFORCE_ENABLED,
      loginUrl: raw.SALESFORCE_LOGIN_URL ?? 'https://login.salesforce.com',
      clientId: raw.SALESFORCE_CLIENT_ID ?? null,
      clientSecret: raw.SALESFORCE_CLIENT_SECRET ?? null,
      username: raw.SALESFORCE_USERNAME ?? null,
      password: raw.SALESFORCE_PASSWORD ?? null,
      securityToken: raw.SALESFORCE_SECURITY_TOKEN ?? null,
      environment: raw.SALESFORCE_ENVIRONMENT ?? 'production',
      apiKeyAlias: raw.SALESFORCE_API_KEY_ALIAS ?? null,
      timeoutMs: raw.SALESFORCE_TIMEOUT_MS,
      maxRetries: raw.SALESFORCE_MAX_RETRIES,
      externalIdField: raw.SALESFORCE_EXTERNAL_ID_FIELD ?? 'Edulure_Project_Id__c'
    },
    crm: {
      hubspotCron: raw.CRM_HUBSPOT_SYNC_CRON ?? null,
      salesforceCron: raw.CRM_SALESFORCE_SYNC_CRON ?? null,
      reconciliationCron: raw.CRM_RECONCILIATION_CRON ?? null,
      reconciliationWindowDays: raw.CRM_RECONCILIATION_WINDOW_DAYS,
      maxConcurrentJobs: raw.CRM_MAX_CONCURRENT_JOBS
    },
    webhooks: {
      enabled: raw.WEBHOOK_BUS_ENABLED,
      pollIntervalMs: raw.WEBHOOK_BUS_POLL_INTERVAL_MS,
      batchSize: raw.WEBHOOK_BUS_BATCH_SIZE,
      maxAttempts: raw.WEBHOOK_BUS_MAX_ATTEMPTS,
      initialBackoffSeconds: raw.WEBHOOK_BUS_INITIAL_BACKOFF_SECONDS,
      maxBackoffSeconds: raw.WEBHOOK_BUS_MAX_BACKOFF_SECONDS,
      deliveryTimeoutMs: raw.WEBHOOK_BUS_DELIVERY_TIMEOUT_MS,
      recoverAfterMs: raw.WEBHOOK_BUS_RECOVER_AFTER_MS
    }
  },
  domainEvents: {
    dispatch: {
      enabled: raw.DOMAIN_EVENTS_DISPATCH_ENABLED,
      pollIntervalMs: raw.DOMAIN_EVENTS_DISPATCH_POLL_INTERVAL_MS,
      batchSize: raw.DOMAIN_EVENTS_DISPATCH_BATCH_SIZE,
      maxAttempts: raw.DOMAIN_EVENTS_DISPATCH_MAX_ATTEMPTS,
      initialBackoffSeconds: raw.DOMAIN_EVENTS_DISPATCH_INITIAL_BACKOFF_SECONDS,
      maxBackoffSeconds: raw.DOMAIN_EVENTS_DISPATCH_MAX_BACKOFF_SECONDS,
      backoffMultiplier: raw.DOMAIN_EVENTS_DISPATCH_BACKOFF_MULTIPLIER,
      jitterRatio: raw.DOMAIN_EVENTS_DISPATCH_JITTER_RATIO,
      recoverIntervalMs: raw.DOMAIN_EVENTS_DISPATCH_RECOVER_INTERVAL_MS,
      recoverTimeoutMinutes: raw.DOMAIN_EVENTS_DISPATCH_RECOVER_TIMEOUT_MINUTES
    }
  },
  payments: {
    defaultCurrency,
    allowedCurrencies,
    reportingTimezone: raw.PAYMENTS_REPORTING_TIMEZONE,
    tax: {
      inclusive: raw.PAYMENTS_TAX_INCLUSIVE,
      table: taxTable,
      minimumRate: raw.PAYMENTS_MINIMUM_TAX_RATE
    },
    stripe: {
      secretKey: raw.STRIPE_SECRET_KEY,
      publishableKey: raw.STRIPE_PUBLISHABLE_KEY ?? null,
      webhookSecret: raw.STRIPE_WEBHOOK_SECRET ?? null,
      statementDescriptor
    },
    paypal: {
      clientId: raw.PAYPAL_CLIENT_ID,
      clientSecret: raw.PAYPAL_CLIENT_SECRET,
      environment: raw.PAYPAL_ENVIRONMENT,
      webhookId: raw.PAYPAL_WEBHOOK_ID ?? null
    },
    escrow: {
      apiKey: raw.ESCROW_API_KEY ?? null,
      apiSecret: raw.ESCROW_API_SECRET ?? null,
      baseUrl: raw.ESCROW_BASE_URL ?? 'https://api.escrow.com/2017-09-01',
      webhookSecret: raw.ESCROW_WEBHOOK_SECRET ?? null
    },
    coupons: {
      maxPercentageDiscount: raw.PAYMENTS_MAX_COUPON_PERCENTAGE
    }
  },
  drm: {
    downloadLimit: raw.DRM_DOWNLOAD_LIMIT
  },
  mail: {
    smtpHost: raw.SMTP_HOST,
    smtpPort: raw.SMTP_PORT,
    smtpSecure: raw.SMTP_SECURE,
    smtpUser: raw.SMTP_USER,
    smtpPassword: raw.SMTP_PASSWORD,
    fromEmail: raw.SMTP_FROM_EMAIL,
    fromName: raw.SMTP_FROM_NAME,
    verificationBaseUrl: raw.EMAIL_VERIFICATION_URL,
    verificationTokenTtlMinutes: raw.EMAIL_VERIFICATION_TOKEN_TTL_MINUTES,
    verificationResendCooldownMinutes: raw.EMAIL_VERIFICATION_RESEND_COOLDOWN_MINUTES
  },
  logging: {
    level: raw.LOG_LEVEL,
    redactedFields,
    serviceName: raw.LOG_SERVICE_NAME ?? 'edulure-api'
  },
  bootstrap: {
    maxAttempts: raw.BOOTSTRAP_MAX_RETRIES,
    retryDelayMs: raw.BOOTSTRAP_RETRY_DELAY_MS
  },
  redis: {
    enabled: raw.REDIS_ENABLED,
    url: raw.REDIS_URL ?? null,
    host: raw.REDIS_HOST,
    port: raw.REDIS_PORT,
    username: raw.REDIS_USERNAME ?? null,
    password: raw.REDIS_PASSWORD ?? null,
    tls: {
      enabled: raw.REDIS_TLS_ENABLED,
      ca: redisTlsCa
    },
    keyPrefix: redisKeyPrefix,
    lockPrefix: redisLockPrefix,
    keys: {
      featureFlags: redisFeatureFlagKey,
      runtimeConfig: redisRuntimeConfigKey,
      featureFlagLock: redisFeatureFlagLockKey,
      runtimeConfigLock: redisRuntimeConfigLockKey
    },
    commandTimeoutMs: raw.REDIS_COMMAND_TIMEOUT_MS,
    lockTtlMs: raw.REDIS_LOCK_TTL_SECONDS * 1000
  },
  retention: {
    enabled: raw.DATA_RETENTION_ENABLED,
    cronExpression: raw.DATA_RETENTION_CRON,
    timezone: raw.DATA_RETENTION_TIMEZONE,
    dryRun: raw.DATA_RETENTION_DRY_RUN,
    runOnStartup: raw.DATA_RETENTION_RUN_ON_STARTUP,
    maxConsecutiveFailures: raw.DATA_RETENTION_MAX_FAILURES,
    failureBackoffMinutes: raw.DATA_RETENTION_FAILURE_BACKOFF_MINUTES
  },
  partitioning: {
    enabled: raw.DATA_PARTITIONING_ENABLED,
    schema: partitionSchema,
    cronExpression: raw.DATA_PARTITIONING_CRON,
    timezone: raw.DATA_PARTITIONING_TIMEZONE,
    dryRun: raw.DATA_PARTITIONING_DRY_RUN,
    runOnStartup: raw.DATA_PARTITIONING_RUN_ON_STARTUP,
    lookaheadMonths: raw.DATA_PARTITIONING_LOOKAHEAD_MONTHS,
    lookbehindMonths: raw.DATA_PARTITIONING_LOOKBEHIND_MONTHS,
    minActivePartitions: raw.DATA_PARTITIONING_MIN_ACTIVE_PARTITIONS,
    archiveGraceDays: raw.DATA_PARTITIONING_ARCHIVE_GRACE_DAYS,
    exportBatchSize: raw.DATA_PARTITIONING_EXPORT_BATCH_SIZE,
    maxExportRows: partitionMaxExportRows,
    maxExportBytes: partitionMaxExportBytes,
    archive: {
      bucket: partitionArchiveBucket,
      prefix: partitionArchivePrefix,
      compress: raw.DATA_PARTITIONING_ARCHIVE_COMPRESS,
      visibility: 'workspace'
    },
    maxConsecutiveFailures: raw.DATA_PARTITIONING_MAX_FAILURES,
    failureBackoffMinutes: raw.DATA_PARTITIONING_FAILURE_BACKOFF_MINUTES
  },
  runtimeConfig: {
    featureFlagCacheTtlMs: raw.FEATURE_FLAG_CACHE_TTL_SECONDS * 1000,
    featureFlagRefreshIntervalMs: raw.FEATURE_FLAG_REFRESH_INTERVAL_SECONDS * 1000,
    configCacheTtlMs: raw.RUNTIME_CONFIG_CACHE_TTL_SECONDS * 1000,
    configRefreshIntervalMs: raw.RUNTIME_CONFIG_REFRESH_INTERVAL_SECONDS * 1000
  },
  chat: {
    presence: {
      defaultTtlMinutes: raw.CHAT_PRESENCE_DEFAULT_TTL_MINUTES,
      maxTtlMinutes: raw.CHAT_PRESENCE_MAX_TTL_MINUTES
    },
    pagination: {
      defaultPageSize: raw.CHAT_MESSAGE_DEFAULT_PAGE_SIZE,
      maxPageSize: raw.CHAT_MESSAGE_MAX_PAGE_SIZE
    }
  },
  directMessages: {
    threads: {
      defaultPageSize: raw.DM_THREAD_DEFAULT_PAGE_SIZE,
      maxPageSize: raw.DM_THREAD_MAX_PAGE_SIZE
    },
    messages: {
      defaultPageSize: raw.DM_MESSAGE_DEFAULT_PAGE_SIZE,
      maxPageSize: raw.DM_MESSAGE_MAX_PAGE_SIZE
    }
  },
  social: {
    pagination: {
      follows: {
        defaultPageSize: raw.SOCIAL_FOLLOW_DEFAULT_PAGE_SIZE,
        maxPageSize: raw.SOCIAL_FOLLOW_MAX_PAGE_SIZE
      }
    },
    recommendations: {
      maxResults: raw.SOCIAL_RECOMMENDATION_MAX_RESULTS,
      refreshMinutes: raw.SOCIAL_RECOMMENDATION_REFRESH_MINUTES
    },
    mute: {
      defaultDurationDays: raw.SOCIAL_MUTE_DEFAULT_DURATION_DAYS
    }
  },
  engagement: {
    defaultTimezone: raw.COMMUNITY_DEFAULT_TIMEZONE,
    reminders: {
      enabled: raw.COMMUNITY_REMINDER_ENABLED,
      cronExpression: raw.COMMUNITY_REMINDER_CRON,
      timezone: raw.COMMUNITY_REMINDER_TIMEZONE,
      lookaheadMinutes: raw.COMMUNITY_REMINDER_LOOKAHEAD_MINUTES,
      batchSize: raw.COMMUNITY_REMINDER_BATCH_SIZE
    }
  },
  search: {
    adminHosts: meilisearchHosts,
    replicaHosts: meilisearchReplicaHosts,
    searchHosts: meilisearchSearchHosts,
    adminApiKey: raw.MEILISEARCH_ADMIN_API_KEY,
    searchApiKey: raw.MEILISEARCH_SEARCH_API_KEY,
    healthcheckIntervalMs: raw.MEILISEARCH_HEALTHCHECK_INTERVAL_SECONDS * 1000,
    requestTimeoutMs: raw.MEILISEARCH_REQUEST_TIMEOUT_MS,
    indexPrefix: raw.MEILISEARCH_INDEX_PREFIX ?? 'edulure',
    allowedIps: searchAllowedIps,
    ingestion: {
      batchSize: raw.SEARCH_INGESTION_BATCH_SIZE,
      concurrency: raw.SEARCH_INGESTION_CONCURRENCY,
      deleteBeforeReindex: raw.SEARCH_INGESTION_DELETE_BEFORE_REINDEX
    }
  },
  observability: {
    tracing: {
      headerName: raw.TRACE_HEADER_NAME.toLowerCase(),
      sampleRate: raw.TRACING_SAMPLE_RATE
    },
    metrics: {
      enabled: raw.METRICS_ENABLED,
      username: raw.METRICS_USERNAME ?? null,
      password: raw.METRICS_PASSWORD ?? null,
      bearerToken: raw.METRICS_BEARER_TOKEN ?? null,
      allowedIps: metricsAllowedIps
    }
  }
};
