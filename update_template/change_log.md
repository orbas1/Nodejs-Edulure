# Change Log (Release 1.10)

## Added
- Multi-role RBAC enforcement with temporary elevation tokens and audit logging.
- Enhanced catalogue search filters and instructor bulk publishing APIs.
- New telemetry metrics and dashboards for business KPIs.

## Changed
- Middleware stack hardened with rate limiting, CORS governance, and improved error handling.
- Build pipeline upgraded to Node.js 18 LTS with blue/green deployment automation.
- Payment, email, and MFA providers upgraded to latest APIs.

## Fixed
- Resolved race condition in course update workflow via optimistic locking.
- Eliminated stale cache issues by broadcasting invalidation events after key mutations.
- Addressed flaky webhook processing with idempotency keys and DLQ support.

## Deprecated
- Legacy `/api/v0` endpoints now read-only. Sunset scheduled for Q4.
- Old SendGrid v2 templates replaced by v3 transactional flows.

## Removed
- Eliminated unused middleware experiments that conflicted with new security policies.

## Security
- Mandatory MFA for admin accounts, rotated service tokens, and improved audit trails.

## Testing
- Lint, unit, integration, contract, and build pipelines now pass in CI build #519 with deterministic seeds eliminating prior dashboard/integration invite flakiness.
