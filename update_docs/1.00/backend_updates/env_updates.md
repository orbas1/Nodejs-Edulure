# Environment Updates

- `.env.example` now documents required JWT, rate-limiting, and database provisioning variables along with optional TTL overrides.
- Added validation for all critical env vars; the service aborts start-up if secrets are shorter than 32 characters or pools are misconfigured.
- Provisioning script honours `DB_PROVISION_USER`/`DB_USER_HOST` flags to avoid shipping default credentials.
- Introduced Cloudflare R2 configuration (`R2_ACCOUNT_ID`, access keys, bucket names, CDN URL) plus upload/download TTL and max size settings.
- Added optional `CLOUDCONVERT_API_KEY` for PowerPoint conversions and `DRM_DOWNLOAD_LIMIT` to enforce ebook download caps.
