# Backend Alignment for Mobile v1.4.0

## API version
- Deploy **backend-nodejs v1.21.0** containing streak analytics aggregation endpoints, refreshed community moderation scopes, and hardened session rotation logic.

## Service changes
1. **Analytics service**
   - Added `/v1/learners/{id}/streaks` endpoint delivering weekly streak stats (cached in Redis 15 min).
   - Introduced rate limiting: 120 requests / min / user, bursting to 240 with token bucket; returns 429 with `Retry-After` header.
2. **RBAC**
   - Extended policy definitions with `instructor.manage_roster`, `finance.manage_payouts`, `community.review_flags`.
   - Updated JWT claims to include `app_roles` array; mobile clients must enforce via UI gating.
3. **Notifications**
   - New streak recovery template in messaging service; respects quiet-hour preferences stored in `/v1/profile/settings`.
   - Push tokens validated through device attestation handshake; invalid tokens quarantined to prevent feedback loop spam.
4. **Downloads**
   - Signed URL expiry reduced to 60 minutes, requiring silent refresh on long-running sessions; mobile SDK updated accordingly.

## Data model updates
- `learner_progress` table: added columns `streak_days INT`, `longest_streak INT`, `streak_updated_at TIMESTAMP`.
- Backfilled historical streak data via idempotent script executed during deployment window.
- Added partial index on `(account_id, streak_updated_at DESC)` to support leaderboard queries.

## Security & compliance
- CORS allowlist reaffirmed: `app.edulure.com`, `cdn.edulure.com`, `admin.edulure.com`, `mobile.edulure.com`.
- Enforced MFA for staff roles; mobile support staff dashboards require hardware key registered via WebAuthn.
- Telemetry pipeline enforces GDPR-compliant retention: mobile session events expire after 14 days unless aggregated.

## Monitoring & alerts
- Prometheus alerts for `streak_sync_failures` > 10/min and `mobile_push_failures` > 5% within 10 min window.
- Added Grafana dashboard `Mobile v1.4` covering streak API latency, cache hit ratio, and push notification throughput.

## Rollback
- Feature flags `streaks.mobile.enabled` and `rbac.mobile.strict_mode` allow toggling features independently.
- Database migration includes down script removing streak columns if rollback required (no data loss for other features).
