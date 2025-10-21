# Dependency Updates

## Runtime Dependencies
- Upgraded Express to 4.19 with latest security patches.
- Updated Stripe, SendGrid, Twilio, Segment SDKs to latest stable versions with breaking change notes documented.
- Bumped Prisma to 5.x for performance improvements and new logging controls.

## Development Dependencies
- Upgraded ESLint, Jest/Vitest, and TypeScript type definitions.
- Added `depcheck` to CI to detect unused packages.

## Security
- `npm audit` and Trivy scans integrated into CI with fail-fast thresholds for high severity vulnerabilities.
- Documented dependency upgrade calendar and owner responsibilities.

## Testing
- ⚠️ `npm run test` – Fails on dashboard and integration invite suites; dependency upgrades verified via targeted smoke tests.
- ⚠️ `npm run lint` – Blocked by outstanding unused variable/import order violations in legacy files.
- ✅ `npm audit --production`
