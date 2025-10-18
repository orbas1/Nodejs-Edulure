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
process.env.R2_QUARANTINE_BUCKET = process.env.R2_QUARANTINE_BUCKET ?? 'edulure-quarantine';
process.env.R2_CDN_URL = process.env.R2_CDN_URL ?? 'https://cdn.edulure.local';
process.env.ASSET_PRESIGN_TTL_MINUTES = process.env.ASSET_PRESIGN_TTL_MINUTES ?? '20';
process.env.ASSET_DOWNLOAD_TTL_MINUTES = process.env.ASSET_DOWNLOAD_TTL_MINUTES ?? '45';
process.env.CONTENT_MAX_UPLOAD_MB = process.env.CONTENT_MAX_UPLOAD_MB ?? '256';
process.env.ANTIVIRUS_ENABLED = process.env.ANTIVIRUS_ENABLED ?? 'true';
process.env.ANTIVIRUS_HOST = process.env.ANTIVIRUS_HOST ?? '127.0.0.1';
process.env.ANTIVIRUS_PORT = process.env.ANTIVIRUS_PORT ?? '3310';
process.env.ANTIVIRUS_TIMEOUT_MS = process.env.ANTIVIRUS_TIMEOUT_MS ?? '5000';
process.env.ANTIVIRUS_MAX_FILE_SIZE_MB = process.env.ANTIVIRUS_MAX_FILE_SIZE_MB ?? '400';
process.env.ANTIVIRUS_FAIL_OPEN = process.env.ANTIVIRUS_FAIL_OPEN ?? 'false';
process.env.ANTIVIRUS_CACHE_TTL_SECONDS = process.env.ANTIVIRUS_CACHE_TTL_SECONDS ?? '60';
process.env.ANTIVIRUS_SKIP_TAG = process.env.ANTIVIRUS_SKIP_TAG ?? 'edulure-skip-scan';
process.env.CLOUDCONVERT_API_KEY = process.env.CLOUDCONVERT_API_KEY ?? 'test-cloudconvert-key';
process.env.DRM_DOWNLOAD_LIMIT = process.env.DRM_DOWNLOAD_LIMIT ?? '3';
process.env.SMTP_HOST = process.env.SMTP_HOST ?? '127.0.0.1';
process.env.SMTP_PORT = process.env.SMTP_PORT ?? '1025';
process.env.SMTP_SECURE = process.env.SMTP_SECURE ?? 'false';
process.env.SMTP_USER = process.env.SMTP_USER ?? 'test-user';
process.env.SMTP_PASSWORD = process.env.SMTP_PASSWORD ?? 'test-password';
process.env.SMTP_FROM_EMAIL = process.env.SMTP_FROM_EMAIL ?? 'security@test.local';
process.env.SMTP_FROM_NAME = process.env.SMTP_FROM_NAME ?? 'Edulure Test Harness';
process.env.EMAIL_VERIFICATION_URL = process.env.EMAIL_VERIFICATION_URL ?? 'https://app.local/verify-email';
process.env.EMAIL_VERIFICATION_TOKEN_TTL_MINUTES =
  process.env.EMAIL_VERIFICATION_TOKEN_TTL_MINUTES ?? '60';
process.env.EMAIL_VERIFICATION_RESEND_COOLDOWN_MINUTES =
  process.env.EMAIL_VERIFICATION_RESEND_COOLDOWN_MINUTES ?? '5';
process.env.ACCOUNT_LOCKOUT_THRESHOLD = process.env.ACCOUNT_LOCKOUT_THRESHOLD ?? '5';
process.env.ACCOUNT_LOCKOUT_WINDOW_MINUTES = process.env.ACCOUNT_LOCKOUT_WINDOW_MINUTES ?? '15';
process.env.ACCOUNT_LOCKOUT_DURATION_MINUTES = process.env.ACCOUNT_LOCKOUT_DURATION_MINUTES ?? '30';
process.env.SESSION_VALIDATION_CACHE_TTL_MS = process.env.SESSION_VALIDATION_CACHE_TTL_MS ?? '60000';
process.env.MAX_ACTIVE_SESSIONS_PER_USER = process.env.MAX_ACTIVE_SESSIONS_PER_USER ?? '10';
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? 'sk_test_1234567890abcdef';
process.env.STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY ?? 'pk_test_1234567890abcdef';
process.env.STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? 'whsec_test_secret_key';
process.env.STRIPE_STATEMENT_DESCRIPTOR = process.env.STRIPE_STATEMENT_DESCRIPTOR ?? 'EDULURE TEST';
process.env.PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID ?? 'paypal-test-client-id';
process.env.PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET ?? 'paypal-test-client-secret';
process.env.PAYPAL_ENVIRONMENT = process.env.PAYPAL_ENVIRONMENT ?? 'sandbox';
process.env.PAYPAL_WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID ?? 'paypal-webhook-id';
process.env.PAYMENTS_DEFAULT_CURRENCY = process.env.PAYMENTS_DEFAULT_CURRENCY ?? 'USD';
process.env.PAYMENTS_ALLOWED_CURRENCIES = process.env.PAYMENTS_ALLOWED_CURRENCIES ?? 'USD,EUR,GBP';
process.env.PAYMENTS_TAX_TABLE =
  process.env.PAYMENTS_TAX_TABLE ?? JSON.stringify({
    US: { defaultRate: 0.07, regions: { CA: 0.0825 } },
    GB: { defaultRate: 0.2 }
  });
process.env.PAYMENTS_TAX_INCLUSIVE = process.env.PAYMENTS_TAX_INCLUSIVE ?? 'false';
process.env.PAYMENTS_MINIMUM_TAX_RATE = process.env.PAYMENTS_MINIMUM_TAX_RATE ?? '0.05';
process.env.PAYMENTS_MAX_COUPON_PERCENTAGE = process.env.PAYMENTS_MAX_COUPON_PERCENTAGE ?? '80';
process.env.PAYMENTS_REPORTING_TIMEZONE = process.env.PAYMENTS_REPORTING_TIMEZONE ?? 'Etc/UTC';
process.env.COMMUNITY_DEFAULT_TIMEZONE = process.env.COMMUNITY_DEFAULT_TIMEZONE ?? 'Etc/UTC';
process.env.COMMUNITY_REMINDER_ENABLED = process.env.COMMUNITY_REMINDER_ENABLED ?? 'true';
process.env.COMMUNITY_REMINDER_CRON = process.env.COMMUNITY_REMINDER_CRON ?? '*/10 * * * *';
process.env.COMMUNITY_REMINDER_TIMEZONE = process.env.COMMUNITY_REMINDER_TIMEZONE ?? 'Etc/UTC';
process.env.COMMUNITY_REMINDER_LOOKAHEAD_MINUTES =
  process.env.COMMUNITY_REMINDER_LOOKAHEAD_MINUTES ?? '30';
process.env.COMMUNITY_REMINDER_BATCH_SIZE = process.env.COMMUNITY_REMINDER_BATCH_SIZE ?? '100';
process.env.DOMAIN_EVENTS_DISPATCH_ENABLED = process.env.DOMAIN_EVENTS_DISPATCH_ENABLED ?? 'true';
process.env.DOMAIN_EVENTS_DISPATCH_POLL_INTERVAL_MS =
  process.env.DOMAIN_EVENTS_DISPATCH_POLL_INTERVAL_MS ?? '1000';
process.env.DOMAIN_EVENTS_DISPATCH_BATCH_SIZE =
  process.env.DOMAIN_EVENTS_DISPATCH_BATCH_SIZE ?? '20';
process.env.DOMAIN_EVENTS_DISPATCH_MAX_ATTEMPTS =
  process.env.DOMAIN_EVENTS_DISPATCH_MAX_ATTEMPTS ?? '6';
process.env.DOMAIN_EVENTS_DISPATCH_INITIAL_BACKOFF_SECONDS =
  process.env.DOMAIN_EVENTS_DISPATCH_INITIAL_BACKOFF_SECONDS ?? '15';
process.env.DOMAIN_EVENTS_DISPATCH_MAX_BACKOFF_SECONDS =
  process.env.DOMAIN_EVENTS_DISPATCH_MAX_BACKOFF_SECONDS ?? '600';
process.env.DOMAIN_EVENTS_DISPATCH_BACKOFF_MULTIPLIER =
  process.env.DOMAIN_EVENTS_DISPATCH_BACKOFF_MULTIPLIER ?? '2';
process.env.DOMAIN_EVENTS_DISPATCH_JITTER_RATIO =
  process.env.DOMAIN_EVENTS_DISPATCH_JITTER_RATIO ?? '0.1';
process.env.DOMAIN_EVENTS_DISPATCH_RECOVER_INTERVAL_MS =
  process.env.DOMAIN_EVENTS_DISPATCH_RECOVER_INTERVAL_MS ?? '30000';
process.env.DOMAIN_EVENTS_DISPATCH_RECOVER_TIMEOUT_MINUTES =
  process.env.DOMAIN_EVENTS_DISPATCH_RECOVER_TIMEOUT_MINUTES ?? '5';
process.env.MEILISEARCH_HOSTS = process.env.MEILISEARCH_HOSTS ?? 'https://meilisearch-primary.local:7700';
process.env.MEILISEARCH_REPLICA_HOSTS =
  process.env.MEILISEARCH_REPLICA_HOSTS ?? 'https://meilisearch-replica.local:7700';
process.env.MEILISEARCH_SEARCH_HOSTS =
  process.env.MEILISEARCH_SEARCH_HOSTS ?? 'https://meilisearch-primary.local:7700,https://meilisearch-replica.local:7700';
process.env.MEILISEARCH_ADMIN_API_KEY =
  process.env.MEILISEARCH_ADMIN_API_KEY ?? 'masterKey-masterKey-masterKey';
process.env.MEILISEARCH_SEARCH_API_KEY =
  process.env.MEILISEARCH_SEARCH_API_KEY ?? 'searchKey-searchKey-searchKey';
process.env.MEILISEARCH_HEALTHCHECK_INTERVAL_SECONDS =
  process.env.MEILISEARCH_HEALTHCHECK_INTERVAL_SECONDS ?? '30';
process.env.MEILISEARCH_REQUEST_TIMEOUT_MS =
  process.env.MEILISEARCH_REQUEST_TIMEOUT_MS ?? '5000';
process.env.MEILISEARCH_INDEX_PREFIX = process.env.MEILISEARCH_INDEX_PREFIX ?? 'edulure';
process.env.MEILISEARCH_ALLOWED_IPS = process.env.MEILISEARCH_ALLOWED_IPS ?? '127.0.0.1/32';
