# Migration Updates

- Added `backend-nodejs/migrations/20241020130000_content_assets.js` to create content asset lifecycle tables with cascade rules and indexes.
- Migration includes safeguards to create tables conditionally (`hasTable`) to support incremental adoption and idempotent deployments.
