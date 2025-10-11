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
