# Export Changes

- `AuthService` now exports `ACCESS_TOKEN_AUDIENCE` for reuse by authentication middleware when verifying issuer/audience claims.
- `src/config/storage.js` exports `r2Client` and `r2Endpoint` for reuse in asset services and future worker processes.
- `StorageService` exports a singleton instance encapsulating presign helpers for controllers and ingestion workers.
