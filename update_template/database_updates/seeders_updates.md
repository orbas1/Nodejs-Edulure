# Seeder Updates

## Staging & QA Seeds
- Added instructor cohorts with realistic class schedules to showcase new bulk publishing workflow.
- Seeded webhook subscriptions for core integrations (LMS, CRM) so staging mirrors production behaviour.
- Added payment ledger samples representing payouts in various currencies for reconciliation demos.

## Production Safeguards
- Production seed scripts remain read-only and validated to avoid accidental data mutation.
- Documented approval workflow for introducing new seed data, requiring product and compliance sign-off.

## Testing
- ✅ `npm run seed:staging` executed successfully with automated verification scripts.
- ✅ Post-seed smoke tests confirmed key user journeys (enrolment, publishing, payout) remain functional.
