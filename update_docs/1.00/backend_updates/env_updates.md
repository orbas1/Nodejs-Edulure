# Environment Updates

- `.env.example` now documents required JWT, rate-limiting, and database provisioning variables along with optional TTL overrides.
- Documented `JWT_KEYSET`, `JWT_ACTIVE_KEY_ID`, `JWT_AUDIENCE`, `JWT_ISSUER`, and `DRM_SIGNATURE_SECRET`, with guidance to prefer keysets over legacy single secrets.
- Added validation for all critical env vars; the service aborts start-up if secrets are shorter than 32 characters or pools are misconfigured.
- Provisioning script honours `DB_PROVISION_USER`/`DB_USER_HOST` flags to avoid shipping default credentials.
- Introduced Cloudflare R2 configuration (`R2_ACCOUNT_ID`, access keys, bucket names, CDN URL) plus upload/download TTL and max size settings.
- Expanded storage configuration with a quarantine bucket (`R2_QUARANTINE_BUCKET`) and antivirus controls (`ANTIVIRUS_ENABLED`, `ANTIVIRUS_HOST`, `ANTIVIRUS_PORT`, `ANTIVIRUS_TIMEOUT_MS`, `ANTIVIRUS_MAX_FILE_SIZE_MB`, `ANTIVIRUS_FAIL_OPEN`, `ANTIVIRUS_CACHE_TTL_SECONDS`, `ANTIVIRUS_SKIP_TAG`) to enforce malware scanning policies.
- Added optional `CLOUDCONVERT_API_KEY` for PowerPoint conversions and `DRM_DOWNLOAD_LIMIT` to enforce ebook download caps.
- Expanded environment validation to cover SMTP credentials (`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL`, `SMTP_FROM_NAME`) alongside verification URLs and TTLs so mail delivery fails fast when misconfigured.
- Introduced email verification governance knobs (`EMAIL_VERIFICATION_URL`, `EMAIL_VERIFICATION_TOKEN_TTL_MINUTES`, `EMAIL_VERIFICATION_RESEND_COOLDOWN_MINUTES`) and lockout controls (`ACCOUNT_LOCKOUT_THRESHOLD`, `ACCOUNT_LOCKOUT_WINDOW_MINUTES`, `ACCOUNT_LOCKOUT_DURATION_MINUTES`).
- Introduced observability knobs (`LOG_SERVICE_NAME`, `LOG_REDACTED_FIELDS`, `TRACE_HEADER_NAME`, `TRACING_SAMPLE_RATE`, `METRICS_*`) to support secure metrics exposure, distributed tracing headers, and custom log governance.
- Added session governance knobs (`SESSION_VALIDATION_CACHE_TTL_MS`, `MAX_ACTIVE_SESSIONS_PER_USER`) aligning backend enforcement with security policy playbooks and logout tooling.
- Documented payments configuration: Stripe keys (`STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_STATEMENT_DESCRIPTOR`), PayPal credentials/environment/webhook ID, currency/tax/coupon controls (`PAYMENTS_DEFAULT_CURRENCY`, `PAYMENTS_ALLOWED_CURRENCIES`, `PAYMENTS_TAX_TABLE`, `PAYMENTS_TAX_INCLUSIVE`, `PAYMENTS_MINIMUM_TAX_RATE`, `PAYMENTS_MAX_COUPON_PERCENTAGE`, `PAYMENTS_REPORTING_TIMEZONE`) added to `.env.example` with validation in `env.js`.
- Added engagement configuration block documenting default timezone, reminder enablement, cron expression, lookahead minutes, batch size, and scheduler timezone so reminder automation can be tuned per environment without code changes.
- Added social graph tuning knobs (`SOCIAL_FOLLOW_DEFAULT_PAGE_SIZE`, `SOCIAL_FOLLOW_MAX_PAGE_SIZE`, `SOCIAL_RECOMMENDATION_MAX_RESULTS`, `SOCIAL_RECOMMENDATION_REFRESH_MINUTES`, `SOCIAL_MUTE_DEFAULT_DURATION_DAYS`) to clamp pagination, govern recommendation refresh cadence, and define default mute durations with validation + `.env.example` documentation.
- Introduced Meilisearch configuration (`MEILISEARCH_HOSTS`, `MEILISEARCH_REPLICA_HOSTS`, `MEILISEARCH_SEARCH_HOSTS`, `MEILISEARCH_ADMIN_API_KEY`,
  `MEILISEARCH_SEARCH_API_KEY`, `MEILISEARCH_HEALTHCHECK_INTERVAL_SECONDS`, `MEILISEARCH_REQUEST_TIMEOUT_MS`, `MEILISEARCH_INDEX_PREFIX`,
  `MEILISEARCH_ALLOWED_IPS`) with Zod validation enforcing host formats, unique keys, timeout bounds, and read-only search
  credentials. `.env.example` now documents production-ready defaults for the explorer cluster.
- Added search ingestion knobs (`SEARCH_INGESTION_BATCH_SIZE`, `SEARCH_INGESTION_CONCURRENCY`, `SEARCH_INGESTION_DELETE_BEFORE_REINDEX`) so operators can tune batch sizing, worker concurrency, and destructive sync safeguards for the new Meilisearch ETL service. Validation enforces sane limits and `.env.example` documents recommended production defaults.
