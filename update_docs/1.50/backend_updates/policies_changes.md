# Policy & Governance Changes – Version 1.50

- Seeded `data_partition_policies` metadata with archive prefixes, grace periods, and manual approval flags so audit, consent, and security incident partitions enforce bespoke retention treatments aligned with enterprise governance commitments.【F:backend-nodejs/src/database/domains/compliance.js†L347-L410】
- Added `data_partition_archives` tracking table plus migration to capture bucket/keys, row counts, and drop timestamps for every archived partition, providing audit evidence for GDPR/DSR responses.【F:backend-nodejs/src/database/domains/compliance.js†L284-L332】【F:backend-nodejs/migrations/20250212121500_partition_archiving.js†L1-L15】
