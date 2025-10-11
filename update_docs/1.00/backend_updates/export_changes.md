# Export Changes

- `src/config/jwtKeyStore.js` exports shared helpers (`getActiveJwtKey`, `verifyAccessToken`, metadata accessors) so middleware and services reuse the same signing logic and rotation metadata.
- `src/config/storage.js` exports `r2Client` and `r2Endpoint` for reuse in asset services and future worker processes.
- `StorageService` exports a singleton instance encapsulating presign helpers for controllers and ingestion workers.
