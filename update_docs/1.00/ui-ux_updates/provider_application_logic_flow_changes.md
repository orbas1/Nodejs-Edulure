# Provider Application Logic Flow Changes

## 1. Media Upload & Publication
1. Provider selects "Upload Deck" or "Upload Ebook" from dashboard action shelf.
2. Validation service checks format, runs antivirus scan, and triggers conversion workers (slides → HTML5, ebook → adaptive package).
3. Conversion status updates in real time through the stepper; provider can attach metadata (course, module, audience tags).
4. Upon success, asset version timeline stores signed URL, checksum, and preview assets in Cloudflare R2; provider receives notification.
5. Provider assigns asset to course lessons with drag-and-drop ordering and optionally schedules announcements to communities.

## 2. Community Event Lifecycle
1. From community hub, provider taps "Create Event" CTA.
2. Modal collects title, tier access, schedule, Zoom/Spaces link, and optional paywall price.
3. Logic checks tier entitlements, posts event to feed, updates calendar widget, and generates follow-up notifications.
4. During event, live chat + presence modules activate; telemetry writes attendance and chat metrics.
5. Post-event, recording upload prompts appear, linking back into asset library with automatic transcription tasks.

## 3. Affiliate Offer Management
1. Provider navigates to affiliate marketplace tab within selected community.
2. Chooses template (course bundle, community membership) and adjusts commission slider; UI previews expected earnings.
3. Backend issues referral links, updates payout ledger, and syncs with admin console for compliance review.
4. Dashboard surfaces status (pending, active, paused) and triggers notifications to eligible promoters.

## 4. Follow Moderation Workflow
1. Provider opens follow requests panel; requests sorted by relationship strength and trust signals.
2. Accepting request updates social graph, triggers welcome automation, and pre-populates recommendation engine signals.
3. Rejecting or blocking writes to moderation log and updates privacy tokens so blocked user cannot see premium content.
4. Follow analytics widget recalculates conversion funnels and surfaces anomalies (e.g., sudden spikes).

## 5. Settings & Compliance Adjustments
1. Provider toggles DRM preference or moderation rule within settings.
2. Confirmation modal summarises downstream impact (learner access, affiliate entitlements).
3. Change persists via audit log entry and pushes to backend configuration service.
4. System emits telemetry event for compliance review and refreshes UI to reflect new defaults.
