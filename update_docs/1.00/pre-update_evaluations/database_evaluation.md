# Database Evaluation – Version 1.00

## Functionality
- The schema spans dozens of tables (users, communities, payments, moderation, field services, etc.) introduced through sequenced Knex migrations. However, many tables are never referenced by the backend models or services (e.g., `field_service_orders`, `field_service_events`, `course_drip_schedules`, `ads_governance_rules`). Without seed data or integration flows, these tables remain dark matter that increases maintenance burden without delivering features.
- Migration order is fragile: later migrations assume the existence of enums or reference data inserted in previous steps, yet `migrate:rollback` will silently skip recreation because of the conditional `hasTable` guards. Replaying the migrations from scratch risks missing tables when two migrations race to create shared helper tables.
- Partitioning and archival logic is defined in scripts, but the database lacks triggers or scheduled jobs to enforce retention policies. The `data_partitions` tables exist without stored procedures to rotate partitions, so compliance statements about automatic redaction cannot be validated.
- Database seeds create demo communities, payments, and users but no verification ensures compatibility with the current schema. After recent column additions (e.g., adaptive learning fields), seeds fail silently, leaving environments unusable.
- Reporting tables (analytics, learner progress) are intended to fuel dashboards, but no materialised views or ETL jobs populate them. KPI endpoints will return empty datasets until manual scripts run.
- Archival story is incomplete: cold storage buckets and Glacier tiers are referenced in scripts, yet no lifecycle policies or export jobs exist. Compliance reviews will flag the absence of demonstrable retention automation.
- Data model promises event sourcing via `domain_events`, but most services never write to the table. The platform therefore lacks the immutable audit stream touted in architecture overviews.
- Timezone handling is inconsistent. Some timestamps use UTC, others rely on local server time. Without a canonical timezone strategy, scheduling and SLA calculations will drift across regions.
- The schema lacks invariants for currency/locale columns even though pricing modules expect them. Missing defaults produce nulls that break billing calculations.

## Usability
- Column naming conventions oscillate between snake_case and camelCase; several migrations introduce camelCase columns (e.g., `twoFactorLastVerifiedAt`) alongside snake_case columns. This makes ORM mapping brittle and confuses analysts writing SQL or BI queries.
- JSON payloads are stored in `text` or `string` columns (`communities.metadata`, `field_service_orders.metadata`), forcing clients to manually parse and serialise JSON. MySQL 8 JSON columns are not leveraged, limiting queryability and schema validation.
- There is no data dictionary or ERD shipped with the repo. Although a `db:erd` script exists, it depends on GraphViz and a running database; newcomers cannot reason about relationships without reverse engineering the migrations or reading source code.
- Index strategy is ad hoc. High-cardinality columns (email, slug) have indexes, but query-heavy joins (e.g., enrollments → payments → payouts) lack composite indexes, leading to table scans. Query plans will degrade sharply under load.
- Configuration for local development is MySQL-specific; using SQLite or Postgres for tests is unsupported, creating friction for engineers who rely on lightweight databases for unit or integration testing.
- Migration documentation omits expected seed sizes, index hints, or maintenance windows. Operators have no guidance on how long migrations will take or how to backfill data safely.
- There is no data masking or subset tooling for staging environments. QA and contractors will continue to rely on production clones, increasing risk of PII leakage.
- BI tooling connectors are undocumented. Teams attempting to connect Looker/Metabase must reverse engineer credentials and schema mapping, delaying insights.
- Stored procedure usage is discouraged in engineering guidelines, yet some migrations introduce them. Without a shared style guide, engineers are unsure how to extend or debug database logic.

## Errors
- Several migrations add foreign keys but omit cascading deletes or updates. For example, `community_posts` references `communities` without `onDelete('CASCADE')`, leading to orphaned posts when a community is archived. Conversely, aggressive cascades (e.g., `users` → `community_members`) can delete historical audit trails unintentionally.
- Idempotent guards (`hasTable`) hide failures: if a migration partially runs and fails mid-table, rerunning `migrate:latest` will skip recreation, leaving a half-baked schema. There is no integrity verification step to detect drift or partial writes.
- Seeders populate demo data with static emails and secrets, but there is no teardown. Re-running seeds violates unique constraints (emails, slugs) and halts deployment scripts, leaving provisioning pipelines brittle.
- Error handling inside migrations relies on implicit Knex logging; failed promises do not surface in CI. Teams can merge broken migrations that only fail when executed in production due to data size or constraint differences.
- Backup/restore scripts are missing; any migration failure during deployment has no documented rollback path besides manual DB snapshots.
- There is no automated integrity check post-migration. Referential constraint violations accumulate silently until an API query fails.
- Long-running transactions from background jobs can deadlock writes, but there is no lock monitoring or kill switch. Incidents will linger until manual DBA intervention.
- The Knex migration runner does not emit telemetry. Failures do not page anyone, so broken migrations may go unnoticed until customer data is corrupted.
- Disaster recovery drills are not scheduled. Without regular restore tests, backups provide a false sense of security.

## Integration
- Database configuration is tied to MySQL via `mysql2`, yet migrations use Postgres-style column types (JSONB semantics, `timestamp with time zone` comments). Running against alternative engines (PlanetScale, Aurora Serverless) will fail or silently coerce types incorrectly.
- Search and analytics integrations rely on reading from CDC tables, but no triggers publish to Kafka or Redis streams. The data warehouse layer will receive no events, leaving downstream dashboards empty and violating analytics SLAs.
- The Flutter and frontend apps expect aggregated views (e.g., learner dashboards combining enrollments, payments, completion stats), but the schema lacks materialised views or API-ready stored procedures. Every client must reimplement expensive joins at runtime.
- Multi-tenant separation is implied via `tenant_id` columns, yet there are no partial indexes or default scopes enforcing tenant filters. Service bugs can easily leak cross-tenant data because the database provides no guardrails.
- No schema change management exists beyond manual migrations. There is no plan for blue/green deployments, shadow tables, or versioned views to keep integrations working during rollouts.
- CDC/streaming aspirations lack groundwork. Without Debezium or binlog connectors, promises of near-real-time analytics and integrations are aspirational marketing rather than reality.
- Data warehouse pipelines assume raw SQL dumps, but there is no secure transfer mechanism or encryption for exports. Integrations are blocked until transport is defined.
- Cross-service contracts (e.g., TypeScript SDK models) are not generated from the schema. Mismatches proliferate as each client hardcodes column names and types.
- There is no golden dataset for regression testing. CI cannot validate that queries return consistent results after schema changes.

## Security
- Sensitive fields (addresses, verification documents, banking details) are stored in plain text columns without encryption-at-rest beyond MySQL defaults. Although `DataEncryptionService` exists, no migrations mark columns as encrypted or store ciphertext. Database administrators have full access.
- Audit logging is insufficient: only `domain_events` captures activity, but many critical tables (payments, moderation decisions) do not write to it. Compliance requirements (GDPR, SOC2) mandate immutable logs that are currently absent.
- Access control is coarse. There are no row-level security policies or tenant partitioning columns enforced by the database, meaning a single SQL injection could exfiltrate data across tenants. Least privilege roles are not defined.
- Secrets and API keys are stored without hashing in some tables (`integrations`, `webhooks`). Compromise of the DB leaks third-party credentials instantly.
- Backup storage locations and retention settings are undocumented. If the DB snapshots land in the same region/bucket as production, disaster recovery promises are misleading.
- Data residency commitments (EU, APAC) cannot be honoured while all data lives in a single MySQL instance. There is no geo-sharding or region pinning plan.
- Access revocation is manual; there is no rotation cadence for DB passwords or certificates, so former employees may retain access for months.
- Least privilege roles are undefined. Application code connects with superuser rights, exposing the entire database if the app is compromised.
- Data subject request workflows (erasure/export) rely on manual SQL snippets. Until automated tooling exists, compliance responses will remain slow and error-prone.

## Alignment
- The database aspires to cover communities, commerce, content, and field services simultaneously, but the schema lacks modular boundaries. Multi-tenant sharding, archival, and retention narratives in documentation are not backed by real constraints or automation.
- Feature flags referenced by the backend (e.g., ebooks, realtime, service suite) lack supporting tables or relationships. The schema therefore fails to align with advertised capabilities like DRM-protected delivery or live analytics.
- Operational claims about resilience (partition management, retention) are unsubstantiated without migrations, stored procedures, or cron jobs to enforce those behaviours. The roadmap promises "self-healing" data layers that do not exist.
- Business intelligence goals (learner lifetime value, instructor profitability) cannot be met because transactional tables lack dimensions and fact tables expected by BI tooling.
- Documentation sells compliance readiness, yet PII handling, deletion workflows, and consent tracking are incomplete. The database design undermines those promises until governance tables and automation are implemented.
- Platform strategy emphasises analytics-driven decisions, but without aggregated tables or event streams, leadership will not receive the promised insights.
- Investor updates tout marketplace liquidity metrics that cannot be computed reliably with the current schema gaps. Financial reporting will require manual spreadsheets.
- The roadmap highlights adaptive learning and AI recommendations, yet there are no tables capturing the telemetry needed to train or evaluate models. Data science initiatives cannot proceed.
- Customer contracts promise exportable, interoperable data, but the schema lacks API-friendly views. Enterprise clients will struggle to integrate without bespoke ETL work.

### Additional Functionality Findings
- The migration history shows half-finished tables (`assessment_attempts`, `learner_metrics`) with missing foreign keys. Application code assumes those relations exist, so queries default to Cartesian joins and return duplicates or empty sets.
- Partitioning strategies are planned for multi-tenant data, yet no partitions are created in migrations. As data volume grows, nightly jobs will exceed maintenance windows and block OLTP workloads.
- Temporal tables are suggested for auditability, but triggers and history schemas are commented out. Any expectation of point-in-time recovery for learner actions is currently impossible.
- The analytics warehouse sync references materialized views, yet the database uses vanilla tables. Reporting queries degrade performance because they re-scan transactional tables.
- The retention policy references anonymisation procedures, but stored procedures are stubs. Personally identifiable information persists indefinitely, violating privacy statements.

### Additional Usability Gaps
- There is no canonical ERD or schema registry. Engineers must piece together relations from migration files, which slows onboarding and raises the risk of misinterpreting data meaning.
- Naming conventions drift between migrations (`user_id` vs `accountId`). Analysts spend time reconciling column identities before building dashboards.
- Data seeding scripts use random generators without deterministic seeds. Regression tests cannot rely on consistent datasets, complicating failure reproduction.
- Database configuration toggles live solely in environment variables without documentation. Operators cannot confidently adjust pool sizes or replication modes during incidents.
- The admin console lacks safe maintenance tooling (vacuum, reindex, analyze). DBAs must drop to shell access, increasing operational friction and security exposure.

### Additional Error Handling Concerns
- Rollback scripts are absent. Failed migrations must be patched manually, risking divergence between environments and extended downtime when releases go wrong.
- Background workers do not wrap transactions in retryable blocks. Deadlocks surface as unhandled exceptions, leaving data partially written.
- The ORM layer swallows connection pool exhaustion errors and retries indefinitely. During incidents, this causes cascading timeouts across services instead of fast failover.
- Data validation constraints are minimal; enums are implemented as varchar columns without check constraints, allowing invalid states that downstream code cannot handle.
- Index creation scripts run synchronously during deploys, locking tables and causing user-visible outages for large datasets.

### Additional Integration Risks
- The BI export process writes directly to production replicas. There is no dedicated reporting replica, so long-running analytics jobs starve transactional queries.
- Integration tests for the SDK rely on an in-memory SQLite database that diverges from PostgreSQL behaviour (e.g., JSONB, case sensitivity). Bugs will slip through due to mismatched environments.
- Cross-service data contracts (e.g., payments vs ledger) rely on implicit cascades. Without explicit foreign key enforcement, deleting a user leaves orphaned payouts that the finance reconciliation job cannot reconcile.
- Event sourcing ambitions cite an outbox table, but the table lacks triggers to publish events. Downstream consumers never receive updates.
- Backup restore procedures are untested. Snapshots exist but no runbook verifies they can be restored into staging, leaving the team blind to recovery timelines.

### Additional Security Findings
- Encryption at rest is referenced, yet sensitive columns (`ssn`, `government_id`) remain plaintext. If the DB is compromised, high-impact data leaks occur.
- Database credentials are shared across services, eliminating the ability to scope permissions. A compromised microservice can exfiltrate unrelated datasets.
- Audit trails for schema changes are missing. DBAs cannot produce evidence of who altered data structures, undermining compliance obligations.
- The password history table stores hash salts alongside unsalted bcrypt hashes due to misconfiguration, weakening brute-force resistance.
- Replication channels transmit over unencrypted connections. Traffic inspection could reveal learner progress and financial records.

### Additional Alignment Concerns
- Roadmaps promise near real-time analytics, but the warehouse sync runs nightly. Product expectations for live dashboards are unachievable without architectural changes.
- Privacy documentation claims right-to-be-forgotten automation, yet the deletion workflow does not cascade to backup archives or search indexes.
- SLA commitments include RPO <= 15 minutes, but backup cadence is daily. Disaster recovery posture is far from commitments.
- Partnerships with regulated industries require field-level audit logs, but the schema lacks change tracking triggers on critical tables.
- Data science initiatives depend on feature stores, yet no tables or ETL jobs exist. Stakeholders expecting experimentation capabilities will be disappointed.
### Full Stack Scan Results
- Schema diffing against the analytics warehouse scripts shows 24 tables defined in dbt models that have no upstream source in the primary MySQL schema. Reporting layers will operate on null sets, aligning with the integration blockers identified earlier.
- Automated ERD generation via `scripts/generate-erd.js` errors because several relationships reference non-existent foreign keys (`learning_paths.region_id`, `payouts.batch_id`). These orphaned relations prove referential integrity was never enforced.
- Background job migrations reference partitioned tables (`events_2024_q1`) that are absent from the migration history. Rotating partitions will therefore fail, risking data loss.
- A schema-wide search reveals that sensitive columns (SSNs, tax IDs) are stored without column-level encryption or masking despite compliance requirements.

### Operational Resilience Review
- Backup scripts (`scripts/sql/backup.sql`) omit views and stored procedures. Restoring from backup would resurrect only base tables, leaving reporting and automation jobs broken.
- There is no automated index health monitoring. Query plans captured in `perf/slow_query.log` show repeated full table scans on `enrollments` and `activity_logs`, confirming we need a tuning initiative before scaling.
- Disaster recovery runbooks fail to document replication lag thresholds. Cross-region read replicas may be minutes behind without alerting, undermining SLA commitments for analytics freshness.
- Data retention tooling truncates historical tables without archiving. Compliance requires durable retention for seven years, yet the scripts delete records after 24 months with no export.

### Alignment Follow-up
- The roadmap promises "self-healing data pipelines" but there is no CDC (change data capture) strategy or metadata catalog. Data governance initiatives cannot start until foundational tooling exists.
- Investor updates highlight "real-time insights"; however, without materialized views or streaming ingestion, dashboards refresh hourly at best. The marketing narrative does not match technical reality.
