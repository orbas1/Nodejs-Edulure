# Version 1.00 – Priority Features To Add

## 1. General Area & Learning Commerce Suite
- **Feature Bundle:** Live feed personalisation, course/ebook storefront, Agora live classrooms, tutor hiring marketplace.
- **Functional Scope:**
  - Feed aggregation service combining course milestones, community highlights, tutor availability, ads, and notifications with moderation filters.
  - Course purchasing with bundles, drip modules, PowerPoint ingestion, recordings, notes, quizzes, assignments, exams, grades, and analytics dashboards.
  - Ebook purchasing with enhanced reader (annotations, highlights, bookmarks, multimedia), DRM-lite controls, author tooling, and upsell prompts.
  - Tutor hire flow with availability calendars, maps, verification badges, chat initiation, booking, payments, reviews, and Agora session hooks.
- **Key Tables & Schemas:** `feeds`, `feed_events`, `course_products`, `course_modules`, `course_powerpoints`, `lesson_notes`, `assignments`, `quizzes`, `exams`, `grades`, `ebook_products`, `ebook_chapters`, `ebook_annotations`, `drm_tokens`, `tutor_profiles`, `tutor_availability`, `tutor_bookings`, `tutor_reviews`.
- **Core APIs/Functions:** `POST /courses`, `POST /courses/{id}/modules`, `POST /courses/{id}/powerpoints`, `GET /feed`, `POST /follow`, `POST /tutor-bookings`, `POST /ebooks`, `GET /ebooks/{id}/reader`, Agora session creation utilities, payment intents for Stripe/PayPal, analytics aggregation jobs.

## 2. Profile & Social Graph Platform
- **Feature Bundle:** Follow graph, component-based profile system, dashboards for students/instructors, affiliate integration.
- **Functional Scope:**
  - Relationship management (follow, unfollow, block, mute) with privacy settings, audit logs, recommendation engine, and notification triggers.
  - Profile components covering headers, stats, achievements, course/community cards, affiliate widgets, financial summaries, timelines, and action shortcuts.
  - Dashboard integration for profile editing, followers list, settings, finance, instructor onboarding, ID verification, communities, ebooks, courses, widgets, analytics.
- **Key Tables & Schemas:** `follows`, `user_privacy_settings`, `profile_sections`, `profile_metrics`, `achievements`, `affiliate_links`, `affiliate_earnings`, `dashboard_widgets`, `id_verifications`.
- **Core APIs/Functions:** `POST /follow/{userId}`, `GET /profiles/{userId}`, `PATCH /profiles/{userId}`, `GET /dashboard/widgets`, aggregation workers for profile metrics, cache invalidation hooks, Flutter component adapters.

## 3. Communities 2.0 & Affiliate Ecosystem
- **Feature Bundle:** Skool-style community experience, roles/governance, paywalls, chat upgrade, leaderboards, affiliate marketplace.
- **Functional Scope:**
  - Community home redesign with hero, announcements, feed filters, maps, classroom links, tier badges, resource libraries.
  - Content lifecycle for posts, comments, replies, polls, maps, events, classroom sessions, calendar sync, streaks, tier points, leaderboards.
  - Role management (members, admins, moderators, owners), permissions, moderation queues, audit logs, spam/bad word scanning.
  - Subscription/paywall tiers via Stripe, PPC/PPI/PPConversion ad placements, affiliate link creation, earnings, withdrawals, instructor dashboard integration.
  - Chat/inbox upgrade with channels, DMs, Agora live hooks, notifications, online tracker, community affiliates section, admin oversight.
- **Key Tables & Schemas:** `communities`, `community_roles`, `community_members`, `community_posts`, `post_categories`, `post_media`, `comments`, `replies`, `polls`, `community_events`, `community_calendars`, `tier_points`, `leaderboards`, `subscriptions`, `paywall_tiers`, `ads_campaigns`, `ads_metrics`, `affiliate_payouts`, `community_affiliates`, `chat_threads`, `chat_messages`.
- **Core APIs/Functions:** `POST /communities`, `POST /communities/{id}/posts`, `POST /communities/{id}/subscriptions`, `GET /communities/{id}/leaderboard`, `POST /ads/campaigns`, `POST /affiliate-links`, websocket chat handlers, moderation queue processors, analytics collectors, Flutter community module endpoints.

## 4. Explorer & Discovery Engine
- **Feature Bundle:** Global explorer navigation, Meilisearch-powered search, discovery analytics, saved searches, voice search.
- **Functional Scope:**
  - Navigation updates adding Explorer menu/header entry, contextual breadcrumbs, saved searches, quick filters.
  - Meilisearch cluster with synonyms, typo tolerance, ranking rules leveraging follows, ratings, tier points, tutor availability, geolocation, and ad relevance.
  - Data ingestion pipelines for communities, profiles, courses, ebooks, tutors, ads; queue-based incremental updates, scheduled reindex, telemetry dashboards.
  - Explorer UI with entity tabs, facets, cards, CTAs (follow, enroll, join, hire), map previews, voice search, offline recent searches, deep links to web/Flutter screens.
- **Key Tables & Schemas:** `search_documents`, `search_jobs`, `saved_searches`, `search_analytics`, `search_filters`, `search_experiments`, `search_voice_logs`.
- **Core APIs/Functions:** `GET /explorer`, `GET /search`, `POST /search/saved`, `DELETE /search/saved/{id}`, Meilisearch sync workers, ranking experiment toggles, analytics dashboards.

## 5. Commerce, Ads, Notifications & Governance
- **Feature Bundle:** Payment infrastructure, Edulure Ads suite, notification centre, policy enforcement, admin/customer service panels, Flutter parity.
- **Functional Scope:**
  - Stripe & PayPal integration for courses, ebooks, live classrooms, tutor bookings, community paywalls; finance dashboards, reconciliation scripts, payouts, tax/VAT handling.
  - Edulure Ads management (campaign setup, budgets, targeting, creatives, PPC/PPI/PPConversion tracking, predictions, traffic forecasting).
  - Notification centre covering follows, chat, classrooms, paywalls, ads, moderation; granular preferences, push/web/mobile integration.
  - Policy & security enforcement: privacy policy, terms, community guidelines, spam/bad word detection, audit logs, incident response.
  - Admin panel extensions (content approvals, moderation, analytics, ads oversight, community governance) and customer service panel (tickets, refunds, escalations).
  - Flutter parity: screens for communities, courses, ebooks, live sessions, tutors, ads, notifications, explorer; shared API clients and caching.
- **Key Tables & Schemas:** `payments`, `payment_intents`, `subscriptions`, `payouts`, `tax_records`, `ad_campaigns`, `ad_targets`, `ad_metrics`, `notifications`, `notification_preferences`, `policy_documents`, `moderation_cases`, `support_tickets`, `mobile_devices`.
- **Core APIs/Functions:** `POST /payments/intent`, `POST /subscriptions`, `GET /finance/summary`, `POST /ads`, `GET /ads/metrics`, `POST /notifications/preferences`, `POST /moderation/report`, `POST /support/tickets`, push notification dispatchers, reconciliation jobs, Flutter sync services.
