# Seeder Updates – Version 1.50

- Enriched the bootstrap seeder with encrypted security incident records, SLA metadata, detection channel tags, and consent/DSR fixtures so operator dashboards and compliance tooling surface realistic production signals during development environments.【F:backend-nodejs/seeds/001_bootstrap.js†L1-L655】【F:backend-nodejs/src/models/SecurityIncidentModel.js†L1-L91】
- Seeded consent policies, consent records, and DSR requests with hashed evidence payloads, escalations, and SLA countdown metadata to power the new compliance APIs and governance dashboards out of the box.【F:backend-nodejs/seeds/001_bootstrap.js†L656-L855】【F:backend-nodejs/src/services/ComplianceService.js†L30-L94】
