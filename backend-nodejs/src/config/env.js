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
  } catch (jsonError) {
    try {
      const decoded = Buffer.from(trimmed, 'base64').toString('utf8');
      return JSON.parse(decoded);
    } catch (base64Error) {
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

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    APP_URL: z.string().min(1, 'APP_URL must specify at least one origin'),
    CORS_ALLOWED_ORIGINS: z.string().optional(),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    JWT_SECRET: z.string().min(32).optional(),
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
    R2_CDN_URL: z.string().url().optional(),
    ASSET_PRESIGN_TTL_MINUTES: z.coerce.number().int().min(5).max(60).default(15),
    ASSET_DOWNLOAD_TTL_MINUTES: z.coerce.number().int().min(5).max(1440).default(60),
    CONTENT_MAX_UPLOAD_MB: z.coerce.number().int().min(10).max(2048).default(512),
    CLOUDCONVERT_API_KEY: z.string().min(1).optional(),
    DRM_DOWNLOAD_LIMIT: z.coerce.number().int().min(1).max(10).default(3),
    DRM_SIGNATURE_SECRET: z.string().min(32).optional(),
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
    ACCOUNT_LOCKOUT_DURATION_MINUTES: z.coerce.number().int().min(5).max(24 * 60).default(30)
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
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration', parsed.error.flatten().fieldErrors);
  throw new Error('Environment validation failed. Check .env configuration.');
}

const raw = parsed.data;

const jwtKeyset = normalizeJwtKeyset(raw.JWT_KEYSET, raw.JWT_SECRET, raw.JWT_ACTIVE_KEY_ID);
const activeJwtKey = jwtKeyset.keys.find((key) => key.kid === jwtKeyset.activeKeyId);

const corsOrigins = (raw.CORS_ALLOWED_ORIGINS ?? raw.APP_URL)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const metricsAllowedIps = parseCsv(raw.METRICS_ALLOWED_IPS ?? '');
const redactedFields = parseCsv(raw.LOG_REDACTED_FIELDS ?? '');

export const env = {
  nodeEnv: raw.NODE_ENV,
  isProduction: raw.NODE_ENV === 'production',
  isDevelopment: raw.NODE_ENV === 'development',
  app: {
    port: raw.PORT,
    corsOrigins
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
    accountLockoutDurationMinutes: raw.ACCOUNT_LOCKOUT_DURATION_MINUTES
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
    cdnUrl: raw.R2_CDN_URL,
    uploadTtlMinutes: raw.ASSET_PRESIGN_TTL_MINUTES,
    downloadTtlMinutes: raw.ASSET_DOWNLOAD_TTL_MINUTES,
    maxUploadBytes: raw.CONTENT_MAX_UPLOAD_MB * 1024 * 1024
  },
  integrations: {
    cloudConvertApiKey: raw.CLOUDCONVERT_API_KEY ?? null
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
