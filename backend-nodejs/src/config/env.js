import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    APP_URL: z.string().min(1, 'APP_URL must specify at least one origin'),
    CORS_ALLOWED_ORIGINS: z.string().optional(),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    JWT_SECRET: z
      .string()
      .min(32, 'JWT_SECRET must be at least 32 characters to provide adequate entropy'),
    JWT_REFRESH_SECRET: z
      .string()
      .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters to provide adequate entropy'),
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
    DRM_DOWNLOAD_LIMIT: z.coerce.number().int().min(1).max(10).default(3)
  })
  .superRefine((value, ctx) => {
    if (value.DB_POOL_MIN > value.DB_POOL_MAX) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['DB_POOL_MIN'],
        message: 'DB_POOL_MIN cannot exceed DB_POOL_MAX'
      });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration', parsed.error.flatten().fieldErrors);
  throw new Error('Environment validation failed. Check .env configuration.');
}

const raw = parsed.data;

const corsOrigins = (raw.CORS_ALLOWED_ORIGINS ?? raw.APP_URL)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export const env = {
  nodeEnv: raw.NODE_ENV,
  isProduction: raw.NODE_ENV === 'production',
  isDevelopment: raw.NODE_ENV === 'development',
  app: {
    port: raw.PORT,
    corsOrigins
  },
  security: {
    jwtSecret: raw.JWT_SECRET,
    jwtRefreshSecret: raw.JWT_REFRESH_SECRET,
    accessTokenTtlMinutes: raw.TOKEN_EXPIRY_MINUTES,
    refreshTokenTtlDays: raw.REFRESH_TOKEN_EXPIRY_DAYS,
    rateLimitWindowMinutes: raw.RATE_LIMIT_WINDOW_MINUTES,
    rateLimitMax: raw.RATE_LIMIT_MAX
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
  logging: {
    level: raw.LOG_LEVEL
  }
};
