process.env.NODE_ENV = 'test';
process.env.PORT = process.env.PORT ?? '4100';
process.env.APP_URL = process.env.APP_URL ?? 'https://app.local';
process.env.CORS_ALLOWED_ORIGINS = process.env.CORS_ALLOWED_ORIGINS ?? 'https://app.local,https://studio.local';
process.env.LOG_LEVEL = process.env.LOG_LEVEL ?? 'error';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret-test-secret-test-secret-123';
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ?? 'refresh-secret-refresh-secret-refresh-secret-456';

if (!process.env.JWT_KEYSET) {
  const keyset = {
    activeKeyId: 'test-key-primary',
    keys: [
      {
        kid: 'test-key-primary',
        secret: process.env.JWT_SECRET,
        algorithm: 'HS512',
        status: 'active',
        createdAt: new Date().toISOString()
      }
    ]
  };

  process.env.JWT_KEYSET = Buffer.from(JSON.stringify(keyset), 'utf8').toString('base64');
  process.env.JWT_ACTIVE_KEY_ID = 'test-key-primary';
}
process.env.TOKEN_EXPIRY_MINUTES = process.env.TOKEN_EXPIRY_MINUTES ?? '120';
process.env.REFRESH_TOKEN_EXPIRY_DAYS = process.env.REFRESH_TOKEN_EXPIRY_DAYS ?? '30';
process.env.DB_HOST = process.env.DB_HOST ?? 'localhost';
process.env.DB_PORT = process.env.DB_PORT ?? '3306';
process.env.DB_USER = process.env.DB_USER ?? 'root';
process.env.DB_PASSWORD = process.env.DB_PASSWORD ?? 'password';
process.env.DB_NAME = process.env.DB_NAME ?? 'edulure_test';
process.env.DB_POOL_MIN = process.env.DB_POOL_MIN ?? '1';
process.env.DB_POOL_MAX = process.env.DB_POOL_MAX ?? '2';
process.env.RATE_LIMIT_WINDOW_MINUTES = process.env.RATE_LIMIT_WINDOW_MINUTES ?? '15';
process.env.RATE_LIMIT_MAX = process.env.RATE_LIMIT_MAX ?? '300';
process.env.R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID ?? 'test-account';
process.env.R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID ?? 'test-access-key';
process.env.R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY ?? 'test-secret-key';
process.env.R2_REGION = process.env.R2_REGION ?? 'auto';
process.env.R2_PUBLIC_BUCKET = process.env.R2_PUBLIC_BUCKET ?? 'edulure-public';
process.env.R2_PRIVATE_BUCKET = process.env.R2_PRIVATE_BUCKET ?? 'edulure-private';
process.env.R2_UPLOADS_BUCKET = process.env.R2_UPLOADS_BUCKET ?? 'edulure-uploads';
process.env.R2_CDN_URL = process.env.R2_CDN_URL ?? 'https://cdn.edulure.local';
process.env.ASSET_PRESIGN_TTL_MINUTES = process.env.ASSET_PRESIGN_TTL_MINUTES ?? '20';
process.env.ASSET_DOWNLOAD_TTL_MINUTES = process.env.ASSET_DOWNLOAD_TTL_MINUTES ?? '45';
process.env.CONTENT_MAX_UPLOAD_MB = process.env.CONTENT_MAX_UPLOAD_MB ?? '256';
process.env.CLOUDCONVERT_API_KEY = process.env.CLOUDCONVERT_API_KEY ?? 'test-cloudconvert-key';
process.env.DRM_DOWNLOAD_LIMIT = process.env.DRM_DOWNLOAD_LIMIT ?? '3';
