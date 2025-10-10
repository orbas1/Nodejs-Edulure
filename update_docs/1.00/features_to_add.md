# Version 1.00 – Features To Add (Deep-Dive Backlog)

## 1. Cloudflare R2 Asset Fabric
| Aspect | Details |
| --- | --- |
| **Feature Summary** | Consolidate all media (videos, PowerPoints, ebooks, community uploads, analytics exports) in Cloudflare R2 with lifecycle automation, antivirus scanning, and signed delivery. |
| **Key Tables** | `storage_assets`, `storage_buckets`, `storage_events`, `storage_audit_logs`, `storage_jobs`, `ppt_conversions`. |
| **Core Services & Functions** | `POST /storage/upload`, `GET /storage/signed-url`, `POST /storage/batch-migrate`, background worker `processR2Lifecycle`, antivirus lambda hook, PPT conversion orchestrator, checksum validator. |
| **UI/UX Surfaces** | Admin console for asset monitoring, instructor upload modal with progress, learner download/view flows with signed URLs, Flutter offline cache manager. |
| **Mobile Requirements** | Flutter SDK for presigned uploads, cached playback, retry queue, encrypted storage for offline ebooks and decks. |

## 2. Course PowerPoint Enablement
| Aspect | Details |
| --- | --- |
| **Feature Summary** | Allow instructors to upload and reuse PowerPoints inside courses, communities, and live sessions with analytics. |
| **Key Tables** | `course_powerpoints`, `ppt_slides`, `ppt_slide_notes`, `ppt_engagement_metrics`, `live_session_slides`. |
| **Core Services & Functions** | `POST /courses/{id}/powerpoints`, `GET /courses/{id}/slides`, `POST /live-sessions/{id}/slides/start`, player controller, transcript extractor, analytics aggregator. |
| **UI/UX Surfaces** | Course builder deck picker, lesson view with slide thumbnails, live instructor console (next slide, notes, timer), learner slide viewer with annotations, Flutter module with swipe gestures and offline mode. |
| **Dependencies** | R2 storage, Agora live classrooms, analytics pipeline, notification triggers for shared decks. |

## 3. Ebook Experience Upgrade
| Aspect | Details |
| --- | --- |
| **Feature Summary** | Modernise ebook storefront and reader with multimedia, annotations, audio narration, DRM-lite, and community sharing. |
| **Key Tables** | `ebook_products`, `ebook_chapters`, `ebook_assets`, `ebook_annotations`, `ebook_bookmarks`, `ebook_highlights`, `ebook_watermarks`, `ebook_audio_tracks`. |
| **Core Services & Functions** | `GET /ebooks/{id}/reader`, `POST /ebooks/{id}/annotations`, `POST /ebooks/import`, `POST /ebooks/{id}/share`, watermark generator, audio sync service, recommendation engine integration. |
| **UI/UX Surfaces** | Storefront with previews, reader with typography controls and multimedia panel, author console for chapter management, analytics dashboard for engagement, Flutter reader with offline syncing and narration controls. |
| **Dependencies** | R2 storage, payments, notifications, community posts (share excerpt), profile shelves, explorer indexing. |

## 4. Social Graph & Followers
| Aspect | Details |
| --- | --- |
| **Feature Summary** | Introduce follow/unfollow/block/mute relationships powering feeds, recommendations, and notifications. |
| **Key Tables** | `follows`, `follow_recommendations`, `user_privacy_settings`, `social_audit_logs`, `mute_lists`, `block_lists`. |
| **Core Services & Functions** | `POST /follow/{userId}`, `DELETE /follow/{userId}`, `POST /block/{userId}`, recommendation worker, feed ranking service, notification dispatcher. |
| **UI/UX Surfaces** | Follow buttons on profiles, courses, communities; suggestion carousels; follower/following lists; moderation settings; Flutter parity with push notifications. |
| **Dependencies** | Profile components, notification centre, explorer ranking, analytics.

## 5. Profile Area Redesign (Component-Based)
| Aspect | Details |
| --- | --- |
| **Feature Summary** | Rebuild profile and dashboard surfaces using reusable components tailored to user types (Student, Instructor) with mobile parity. |
| **Key Tables** | `profile_components`, `profile_layouts`, `profile_metrics`, `achievements`, `affiliate_links`, `finance_snapshots`, `dashboard_widgets`. |
| **Core Services & Functions** | `GET /profiles/{id}`, `PATCH /profiles/{id}`, component registry service, metrics aggregation jobs, caching layer, Flutter component mapper. |
| **UI/UX Surfaces** | Profile hero, badges, course/ebook shelves, community memberships, affiliate earnings, revenue graphs, quick actions, instructor dashboards, admin moderation views, Flutter tabs with identical structure. |
| **Dependencies** | Follow graph, communities, payments, analytics, styling tokens, localisation service. |

## 6. Communities 2.0 Platform (Skool-Class)
| Aspect | Details |
| --- | --- |
| **Feature Summary** | Deliver a comprehensive community platform featuring feeds, roles, paywalls, chat, leaderboards, maps, affiliates, and admin oversight with web + mobile parity. |
| **Key Tables** | `communities`, `community_members`, `community_roles`, `community_posts`, `post_categories`, `post_media`, `comments`, `replies`, `polls`, `community_events`, `community_calendars`, `tier_points`, `leaderboards`, `subscriptions`, `paywall_tiers`, `community_affiliates`, `affiliate_payouts`, `chat_threads`, `chat_messages`, `community_notifications`, `moderation_cases`. |
| **Core Services & Functions** | `POST /communities`, `POST /communities/{id}/posts`, `GET /communities/{id}/feed`, `POST /communities/{id}/subscriptions`, `GET /communities/{id}/leaderboard`, `POST /community-affiliates`, chat websocket handlers, moderation queue processor, paywall entitlement checker, map rendering service, classroom integration hooks. |
| **UI/UX Surfaces** | Redesigned community home (hero, announcements, filters), feed cards with rich media, chat/inbox UI, calendar & classroom tabs, leaderboards, tier point trackers, affiliate marketplace, admin moderation dashboards, Flutter screens mirroring all functionality with offline caching and push notifications. |
| **Dependencies** | Payments, notifications, Agora live classrooms, R2 storage, follow graph, explorer indexing, admin panel, analytics.

## 7. Explorer & Search Engine
| Aspect | Details |
| --- | --- |
| **Feature Summary** | Launch a Meilisearch-powered explorer covering communities, profiles, courses, ebooks, tutors, and ads with voice search and saved filters. |
| **Key Tables** | `search_documents`, `search_jobs`, `search_filters`, `saved_searches`, `search_analytics`, `search_click_events`, `search_voice_logs`. |
| **Core Services & Functions** | `GET /explorer`, `GET /search`, `POST /search/saved`, `DELETE /search/saved/{id}`, ETL pipeline worker, ranking experiment toggles, anomaly detector, voice transcription handler. |
| **UI/UX Surfaces** | Explorer navigation entry, entity tabs, filter/facet sidebar, map previews, quick actions (follow, join, enroll, hire), saved searches manager, analytics dashboards, Flutter explorer with voice search and offline recents. |
| **Dependencies** | Meilisearch infrastructure, follow graph signals, community/course/tutor indexers, notifications, ads placement engine, analytics.

## 8. Notifications, Policies & Operations
| Aspect | Details |
| --- | --- |
| **Feature Summary** | Centralise notifications, policy enforcement, admin/support operations, and analytics for the expanded platform. |
| **Key Tables** | `notifications`, `notification_preferences`, `policy_documents`, `moderation_rules`, `moderation_cases`, `support_tickets`, `admin_actions`, `analytics_dashboards`. |
| **Core Services & Functions** | `POST /notifications`, `POST /notifications/preferences`, moderation workflow engine, policy versioning, support ticket routing, analytics collector, incident response playbook executor. |
| **UI/UX Surfaces** | Notification centre (web + Flutter), admin panel modules (policy, moderation, analytics), support dashboard, compliance audit view, customer service console, alerts for R2/search/communities metrics. |
| **Dependencies** | All domain services (communities, profiles, courses, explorer), payments, analytics, mobile push infrastructure.
