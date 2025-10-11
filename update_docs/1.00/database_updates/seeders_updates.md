# Seeders Updates

- Added `backend-nodejs/seeds/001_bootstrap.js` seeding verified admin/instructor/learner accounts, dual communities with trigger-driven owner enrolment, asset lifecycle telemetry, ebook progress, domain events, and active vs stale sessions to exercise governance flows and retention policies.
- Seeder now provisions feature flag definitions, audit history, and runtime configuration entries (support contact, admin escalation channels, live classroom ceilings) so QA environments mirror production governance.
- Commerce seed expansion inserts launch coupons, tax jurisdictions, and reference orders/transactions so payment flows, refund logic, and financial reporting dashboards have realistic fixtures during QA and demos.
