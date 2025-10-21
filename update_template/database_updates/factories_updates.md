# Factory Updates

## Test Data Factories
- Updated course factory to include new `version` and `publish_batch_id` fields with sensible defaults.
- Added webhook delivery factory generating realistic payloads for payment and enrollment events.
- Created payment ledger factory referencing Stripe payout IDs to support reconciliation tests.

## Seed Data
- Instructor seed data now includes default bulk publishing batches for staging demos.
- Added feature flag seed ensuring beta features remain disabled in production by default.

## Validation
- ✅ `npm run test -- factories` ensures new factories integrate with existing suites.
- ✅ Snapshot tests updated to match revised data models.
