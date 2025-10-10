# Other Backend Updates

- Modernised `scripts/install-db.js` to provision databases programmatically, run Knex migrations/seeds, and avoid shipping default SQL credentials.
- Replaced the legacy SQL installer (`database/install.sql`) with a documented placeholder explaining the new provisioning workflow.
- Updated `backend-nodejs/README.md` with hardened onboarding steps, required environment variables, and governance scripts.
- Documented Cloudflare R2, CloudConvert, and DRM environment requirements in the README along with ingestion worker behaviour and new content endpoints.
