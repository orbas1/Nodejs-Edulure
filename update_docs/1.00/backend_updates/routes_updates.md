# Routes Updates

- Added `GET /api/docs` Swagger UI and enhanced `GET /health` to perform database checks.
- Updated user and community routes to enforce role hierarchy via the hardened auth middleware.
- Registered `/api/content` router exposing upload sessions, ingestion confirmation, listing/detail, viewer token, analytics, events, and progress endpoints guarded by auth roles.
- Extended `/api/auth` router with `/verify-email`, `/resend-verification`, `/refresh`, `/logout`, and `/logout-all` endpoints powering verification and session governance flows.
- Registered `GET /metrics` as a Prometheus scrape endpoint guarded by bearer/basic credentials and IP allow-lists for the operations team.
- Registered `/api/courses` routes covering listing, CRUD for modules/lessons/assignments, enrollment management, and learner progress updates behind role-aware auth middleware.
- Registered `/api/ebooks` routes covering listing/detail, create/update/publish flows, chapter CRUD + reorder, highlight/bookmark management, reader settings, and DRM download issuance with auth gating aligned to instructors/admins for authoring and authenticated learners for reading.
- Registered `/api/tutors` routes exposing tutor profile CRUD, availability publishing, booking creation/cancellation, hourly rate updates, and booking summary reporting with instructor/admin guards.
- Registered `/api/live-classrooms` routes for classroom scheduling, invite code generation, registration (free/paid), join context issuance (Agora token + CDN endpoints), chat session retrieval, and seat limit administration with analytics hooks.
- Registered `/api/payments` routes for Stripe/PayPal intent creation, PayPal capture, refund issuance, finance summaries, coupon lookups, and Stripe webhook ingestion with raw-body middleware and role-aware guards.
- Expanded `/api/communities` router with engagement endpoints for progress snapshots, instructor-awarded points, streak check-ins, leaderboards, event calendars, RSVP tracking, and reminder scheduling to power automated community programmes.
- Added `/api/communities/:communityId/chat/...` routes for channel listing, paginated timelines (with thread filters), read receipts, reactions, moderation, and presence updates plus the standalone `/api/chat` router for DM thread listing/creation, message posting, and read acknowledgements.
- Registered `/api/social` routes to deliver the follower graph: follower/following listing with pagination filters, follow/unfollow actions, approval/decline endpoints, recommendations, mutes, blocks, and privacy CRUD; all routes reuse the hardened auth middleware and the shared response envelope.
