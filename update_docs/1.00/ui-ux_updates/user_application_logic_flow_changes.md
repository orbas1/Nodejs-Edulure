# Version 1.00 Learner Application Logic Flow Changes

## 1. Account Access & Onboarding
1. Learner launches app and selects Sign In or Create Account. Social logins (Google, Apple) supported alongside email/password.
2. Successful authentication retrieves profile snapshot (progress, communities, streak data). First-time users presented with onboarding questions (learning goals, preferred topics).
3. Responses feed recommendation service and set default daily goal. Completion triggers tooltips highlighting navigation tabs and download manager.

## 2. Resume Learning Path
1. Home hero “Continue Learning” card surfaces highest priority course/ebook based on last activity timestamp and due dates.
2. Selecting card checks local cache for offline assets; if stale, background sync fetches updates before launching viewer.
3. Viewer loads with persisted slide/page position, note anchors, and playback speed. Progress updates streamed to server every 30 seconds and upon completion.
4. Lesson completion fires `lesson_completed_v1` event, unlocks next lesson, and prompts user with recap modal linking to community discussion.

## 3. Assessment Engagement
1. When encountering inline quiz, user selects answer(s); immediate validation displays correct/incorrect state with explanatory text.
2. Results update mastery model and adjust recommendation weights. Incorrect answers may trigger micro-remediation suggestions (link to relevant slide/page).
3. Quiz completion logs to achievements service for badge progression and streak calculations.

## 4. Community Joining & Participation
1. From feed or explorer, learner taps community card. Access check determines join flow:
   - **Open community:** Immediate join, preference sheet asks for notification cadence and preferred channels.
   - **Tiered community:** Pricing sheet displayed; once transaction completes, membership status updated.
2. Upon join, system queues onboarding tasks (introduce yourself post, recommended challenge). Feed rehydrates to include community posts.
3. Chat service subscribes learner to default channels. Unread counters update header bell and community list.
4. Leaving or downgrading community requires confirmation sheet; system revokes tier benefits and prompts optional feedback survey.

## 5. Explorer Search & Save Flow
1. Global search entry captures query; suggestions appear in dropdown using trending topics and recent searches.
2. Submitting query hits search service with filters applied (chips or drawer). Results update asynchronously with skeleton placeholders.
3. Tapping result opens detail sheet with summary, rating, tags, CTAs (Enroll, Follow, Save). Save adds item to Saved list and surfaces toast confirmation.
4. Saved items accessible from Home filter; removal via long-press triggers undo snackbar.

## 6. Notification & Messaging Handling
1. Real-time service pushes notifications to bell icon; badge increments by priority group.
2. Opening drawer marks visible items as read, while swiping item reveals quick actions (mute, unfollow, mark done).
3. Messaging threads maintain optimistic updates; unsent messages queued offline with retry indicator.
4. Notification preferences adjustable from inline link; toggling updates server profile and recalculates digest scheduling.

## 7. Profile, Goals & Streak Management
1. Learner accesses Profile to update avatar, bio, and goals. Changing daily goal adjusts reminder cadence and home hero progress ring target.
2. Streak tracker updates at midnight based on completion events; if at risk, push reminder issued two hours before day end.
3. Export data request (notes, highlights) triggered from profile > Data Export; status shown via toast and email confirmation on completion.

## 8. Accessibility & Personalisation
1. Accessibility settings allow toggling dyslexia-friendly font, high-contrast mode, text scaling. Adjustments immediately re-render UI components with new tokens.
2. System stores preferences locally and on server to ensure cross-device sync. Reduced motion preference disables feed animations and content transitions.
3. Screen reader hints added to key components; focus order defined to match visual hierarchy.

## 9. Offline Usage Flow
1. Learner selects content for download from lesson drawer or offline manager; queue shows progress bars and storage meter.
2. If network lost, app displays offline banner and switches to cached content mode. Actions requiring network greyed out with tooltip.
3. Upon reconnection, queued progress updates sync; conflicts (e.g., notes edited offline + online) resolved via merge prompt.

## 10. Support & Reporting
1. Help widget invoked from question mark icon; search query returns curated FAQ results.
2. If issue unresolved, learner submits ticket with category and optional screenshot. Confirmation toast displays case ID.
3. Reporting content flow captures context (post ID, timestamp). Moderation service acknowledges and updates learner via notification when resolved.

## 11. Billing & Subscription Management
1. When encountering paywalled content, system checks entitlement; if expired, presents paywall with plan options and trial eligibility message.
2. Selecting plan opens payment sheet; saved cards retrieved securely, new card input tokenised before submission.
3. Successful purchase updates entitlements instantly, unlocks content, and sends receipt email. Failure surfaces inline errors and offers retry or alternate method.
4. Learners can manage subscription in settings; downgrades scheduled for period end with confirmation banner summarising remaining access.

## 12. Guardian & Safety Controls
1. For underage profiles, guardian approval required; invitation email includes secure link to approve features.
2. Guardian dashboard allows toggling messaging, community access, and bedtime quiet hours. Changes propagate across learner session with toast messaging.
3. Safety incidents (reports filed, blocks) notify guardian with summary and recommended actions.

## 13. Analytics & Insight Generation
1. Weekly insights generated from progress data; system aggregates metrics, composes charts, and surfaces personalised suggestions.
2. Learner interaction with insights (e.g., accepting recommendation) logs events to improve future suggestions.
3. Downloading data export triggers job creation; status updates via notification and email when ready.

## 14. Offline Conflict Resolution
1. When syncing after offline session, conflicts flagged (e.g., note edited on two devices). Merge prompt displays side-by-side comparison with accept/override options.
2. If sync fails due to authentication expiry, app prompts re-authentication while retaining offline progress in secure storage.

## 15. Accessibility Preferences Sync
1. Accessibility settings updates propagate to server; other devices fetch preferences on login and apply instantly.
2. Reduced motion preference disables auto-play of animations and carousels; ensures consistent experience across sessions.

## 16. Live Classroom Participation & Tutor Booking
1. Learner navigates to Tutor tab or receives push notification; storefront card loads availability calendar, rating, and hourly rate. Selecting slot opens confirmation sheet with countdown hold timer per `App_screens_drawings.md`.
2. Application validates prerequisites (subscription, credits) and surfaces upsell if needed. Confirming booking triggers backend call; success displays summary with add-to-calendar, message tutor, and manage booking actions.
3. Lobby reminder notification fires 15 minutes pre-session; tapping opens lobby with agenda, materials download, audio/video test, and chat introduction prompt referencing `App_screens_drawings.md` and `dashboard_drawings.md`.
4. Join button requests Agora token; if failure, fallback instructions appear with retry. During session, learner can toggle chat tabs, raise hand, respond to polls, and view moderated Q&A.
5. If connection drops, reconnection overlay appears with spinner; after 60 seconds, offer to watch recording when available. Post-session survey surfaces with rating scale, review text, and CTA to book follow-up.
6. Booking management screen allows rescheduling, cancellation (with policy copy), and download of session recordings. Actions trigger push/email notifications for both learner and tutor.

## 17. Commerce & Payments Flow
1. Learner initiates checkout from storefront, cart, or booking confirmation; sheet shows order summary, tax estimate, coupon entry, and saved payment methods referencing `user_application_styling_changes.md`.
2. Stripe card entry validates number/expiry/CVC inline; on submit, app awaits intent status and surfaces SCA challenge if required. Failure states display actionable copy and allow retry or provider switch.
3. Selecting PayPal launches external approval; upon return, app polls payment status and displays receipt with download links. If capture pending, banner explains next steps and retry window.
4. Receipt screen provides order details, email delivery toggle, and shortcuts to learning content. Refund CTA visible when policy allows; tapping opens guided form for amount/reason referencing `Design_Task_Plan_Upgrade/Application_Design_Update_Plan/Application Design Update.md`.
5. Payment history lists past transactions with status chips, filter controls, and export option. Pending states auto-refresh every few seconds; failed transactions include support contact link and ability to retry payment method.
6. Refund tracking updates push notifications and in-app status; if webhook indicates failure, learner sees alert with instructions and direct chat escalation.
