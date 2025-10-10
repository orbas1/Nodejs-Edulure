# Database Evaluation (v1.50 Pre-Update)

## Functionality
- Schema migrations cover `users`, `communities`, and `community_members`, which supports the minimal community membership flow. However, tables for posts, lessons, payments, analytics, or notifications referenced in the UI are absent, so core product features cannot persist data yet.
- There is no migration tracking table or versioning framework. SQL files exist, but there is no tooling (e.g., Knex, Prisma, Flyway) to apply them idempotently or track execution order, raising the risk of drift between environments.
- Community creation lacks triggers or stored procedures to auto-enrol owners into `community_members`. Without this, the API's `listByUser` query will omit newly created communities until a separate insertion occurs.

## Usability
- The SQL scripts are readable and small, but there is no seed data describing typical edge cases (large communities, different roles, archived records). QA and developers will have to craft their own data sets for testing.
- Naming conventions mix snake_case columns with camelCase property names in application code, causing mapping overhead and potential mistakes when writing queries.
- There are no views or materialised aggregates to support dashboards; reporting will require ad-hoc joins every time.

## Errors
- Foreign keys exist but lack `ON UPDATE` cascades, and there is no defensive handling for orphan records if a user is deleted. Deleting a user will cascade membership rows but leave owned communities without a valid `owner_id`.
- Migration execution order is manual; running them out of sequence (e.g., applying community tables before users) will fail due to missing foreign key targets. No guard rails prevent partial application.
- The install script grants privileges before schema creation, so errors in migration scripts might leave the database partially configured without an easy rollback path.

## Integration
- The database layer is tightly coupled to the backend via raw SQL. There are no abstractions for reuse across services or analytics pipelines. Introducing an ORM or query builder would improve integration with TypeScript-based services if the stack evolves.
- Connection pooling is handled in code, but there is no environment parity guidance (e.g., running MySQL locally vs. managed cloud). CI/CD pipelines will need dedicated setup scripts.
- No data access policies exist for BI tools or customer support dashboards. Role-based access at the database level is a prerequisite for enterprise adoption.

## Security
- The installer script creates a globally accessible MySQL user with a hard-coded password and full privileges on the schema. This is unsuitable for production and should be replaced with environment-specific secrets and principle-of-least-privilege grants.
- Sensitive columns (password hashes, potential PII like addresses) are stored in plain text fields without encryption at rest or access auditing. There is no field-level masking for analytics replicas.
- There is no migration handling for GDPR/CCPA requirements (soft delete flags, consent tracking, data retention policies), which will be mandatory for global launches.

## Alignment
- Database capabilities do not yet align with the product narratives about AI-assisted feeds, live sessions, or monetisation. New tables for content, transactions, and telemetry must be prioritised for the 1.50 update.
- Observability is limited to application logs; there are no database health checks, slow query logs, or performance monitoring strategies outlined. Scaling to thousands of communities will require indexes and partitioning plans.
- The seed data positions the platform with pre-existing communities and users, but there is no localisation or multi-tenant separation, conflicting with the "workspace" framing in the UI.
