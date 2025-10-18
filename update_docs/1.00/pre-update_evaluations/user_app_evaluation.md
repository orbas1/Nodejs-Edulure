# User App Evaluation (Flutter) – Version 1.00

## Functionality
- The Flutter shell exposes dozens of routes mirroring the web app, but most screens are static placeholders that call services returning mock data. Key modules (service suite, ads governance, mobile creation companion) reference feature flags that are never delivered by the backend, so toggling them has no effect and leaves the UX in a perpetual beta state.
- Session bootstrap (`AppBootstrap.create`) initialises Hive boxes for dashboards, ebooks, notifications, etc., yet the app never hydrates them from a remote source. Offline scenarios therefore display empty states even after a successful sync, violating offline-first promises.
- Push notifications and background sync are declared (service stubs, action queues) but not wired to Firebase/APNs. Users cannot receive realtime updates, making the "mobile companion" positioning misleading and undermining instructor responsiveness.
- Media and ebook features rely on background isolates to process downloads, but these isolates are not launched. Buttons trigger no-ops or produce toasts stating "Coming soon," eroding trust.
- The in-app purchase and subscription scaffolding is commented out. Monetisation experiments promoted in the roadmap cannot be executed until the payment SDKs are integrated and tested.
- Learning plan synchronisation references calendar exports, but calendar APIs are not implemented. Users cannot subscribe to schedules despite marketing collateral highlighting the feature.
- QR code scanning and attendance capture screens depend on plugins that are not configured. Attempting to scan yields runtime errors, undermining trust during on-site sessions.
- Tutor-coach messaging relies on a chat module that never initialises sockets. Conversation histories remain empty and message sends fail silently.
- Embedded webviews for policies and knowledge base articles lack navigation controls. Users get trapped without a way to return to the app shell.

## Usability
- The app launches with a blank screen while bootstrapping Hive and feature flags. There is no splash/loading indicator or error message when initialisation fails (e.g., secure storage unavailable), so users perceive the app as frozen.
- Navigation relies on named routes without deep link handlers. Attempting to open `/communities` from a push notification or marketing link will silently fail, breaking cross-channel workflows.
- Form factors are not optimised: many screens assume wide layouts and overflow on smaller devices. There is minimal adaptive design despite Flutter's layout capabilities, and accessibility font scaling causes text clipping.
- Settings and profile flows bury critical toggles in nested menus. There is no search or highlight for newly released features, hampering discoverability.
- Localization is incomplete. Although `intl` is configured, only English strings exist and date/number formats ignore locale preferences.
- Animations and transitions are inconsistent. Some flows use heavy lottie files while others rely on abrupt screen swaps, making the experience feel unfinished.
- The design language diverges from the web dashboard (colors, typography). Without a shared design token system, cross-platform parity remains aspirational.
- Push notification settings exist but do not map to backend topics. Users toggle switches with no actual effect, leading to false expectations about alerts.
- App navigation drawers expose feature flags that are disabled, resulting in dead-end screens and user frustration.

## Errors
- Network services wrap Dio but do not standardise error responses. Callers destructure `response.data['data']` without checking status codes, leading to `NoSuchMethodError` when the backend returns validation errors or rate limit payloads.
- `SessionManager.init` opens more than ten Hive boxes synchronously. If any fails (e.g., permission denied), the entire app crashes without fallback. There is no retry, lazy initialisation, or degraded experience mode.
- Feature flag loading uses Riverpod futures but callers read flags synchronously. During loading, `featureFlags['mobile.serviceSuite']` resolves to `null`, causing routes to disappear/reappear unpredictably and breaking navigation history.
- Crash reporting is not configured. Flutter error widgets show in release builds, and there is no integration with Sentry/Firebase Crashlytics, leaving the team blind to production issues.
- Unit tests are absent. Even basic widget tests for login or dashboards are missing, so regressions slip through.
- Error dialogs fail to clear the navigation stack. After acknowledging an error, users land on blank screens that require force quitting the app.
- API response parsing throws when optional arrays return `null`. Without defensive coding, the app crashes on legitimate backend responses.
- Logging is verbose and leaks into release builds, but there is no log scrubber. Sensitive data can end up in third-party crash reports once instrumentation is added.
- Feature flag fetch failures default to enabling everything. The fail-open posture can expose unfinished features to production users.

## Integration
- API configuration relies on `String.fromEnvironment`, making it compile-time only. There is no runtime configuration for staging vs production; distributing QA builds requires recompilation and manual environment switches.
- Auth flows store tokens via `SessionManager`, but no refresh logic is implemented. When access tokens expire, API calls fail until the user re-authenticates manually, producing a frustrating churn cycle.
- Content features (ebooks, media downloads) depend on background queues, yet download workers are not implemented. Buttons trigger no-ops, harming trust and blocking curriculum adoption.
- Analytics and telemetry integrations are placeholders. Without connection to Segment/Firebase Analytics, product teams cannot measure mobile engagement or funnel drop-off.
- Mobile release tooling (fastlane, code signing, beta distribution) is absent. Integration with CI/CD is manual, slowing delivery cadence.
- The offline caching layer stores large payloads without eviction. Devices with low storage will experience OS-level purges, leading to repeated downloads and degraded UX.
- Deep link routing is unimplemented. Marketing campaigns cannot drive users to specific screens, limiting growth experiments.
- Accessibility testing is nonexistent. VoiceOver/TalkBack navigation stops on decorative elements without labels, violating accessibility commitments.
- Device-specific integrations (camera, file picker) do not handle permissions gracefully. Denying permissions traps users without explanatory copy.

## Security
- Access and refresh tokens are cached in Hive and secure storage, but encryption is limited to the platform default. There is no device binding, biometric gating, or session timeout, increasing risk if a device is lost or stolen.
- The app trusts locally cached feature flags for access control. A compromised device can flip flags to unlock hidden routes because the enforcement happens client-side without server confirmation.
- Privacy preferences and notification toggles are stored locally without syncing to the backend. Users cannot exercise GDPR/DSR rights reliably, contradicting privacy claims and exposing the company to compliance breaches.
- SSL pinning and certificate validation customisation are absent. Man-in-the-middle attacks on unsecured Wi-Fi could intercept traffic because Dio uses default settings.
- Logging includes verbose debug statements (tokens, user IDs) in release builds due to `kReleaseMode` checks being bypassed. Sensitive data may leak to shared logs.
- Root/jailbreak detection is absent despite compliance language promising secure handling of regulated data. High-risk deployments cannot proceed without posture checks.
- Secure storage fallback paths store tokens in plain preferences when secure storage fails. There is no user warning or forced logout.
- No effort has been made to rotate encryption keys. Compromised keys cannot be revoked without forcing an app reinstall.
- The analytics consent banner does not sync with backend records, potentially violating privacy regulations when users opt out but tracking continues locally.

## Alignment
- Marketing positions the mobile app as a "field companion" yet critical flows (service dispatch, tutor scheduling, ads governance) lack working integrations. The shipped app does not align with those promises and risks churn among pilot customers.
- Accessibility is minimal: font scaling, screen reader labels, and contrast checks are missing. Internationalisation is limited to locale switching without translated strings, conflicting with global expansion goals.
- Analytics/instrumentation is absent. Without usage telemetry, the team cannot validate hypotheses about learner engagement or instructor productivity, misaligning with OKRs focused on retention.
- Roadmap decks mention parity with the web dashboard, but feature completeness lags significantly. Without a public parity matrix, expectations will continue to diverge.
- Store listing claims around offline access, realtime alerts, and personalised insights remain unfulfilled. Legal and marketing teams need a disclaimer until the functionality ships.
- Product strategy documents highlight cohort-based nudges, but push/email orchestration is unimplemented. Value propositions around retention interventions are unsubstantiated.
- Investor updates cite mobile-first growth, yet DAU/MAU telemetry is absent. The company cannot credibly report success metrics without instrumentation.
- Support operations expect in-app ticket submission, but the feature is stubbed. Users must leave the app to request help, lowering satisfaction scores.
- Competitive analysis emphasises multilingual onboarding, but the current build offers English-only flows. International expansion goals are at risk without localisation investment.

### Additional Functionality Findings
- Course playback references adaptive recommendations but the client consumes static JSON fixtures. Learners never see personalised suggestions promised in marketing.
- Offline download toggles exist in the UI, yet there is no persistence layer or background service to cache content. Tapping the toggle produces no effect.
- Live session reminders point to calendar integration, but deep links are placeholders that open blank screens.
- Assessment flows lack partial scoring and do not surface correct answers after submission despite copy suggesting formative feedback.
- Progress analytics omit cohort comparisons even though dashboards advertise peer benchmarks.

### Additional Usability Gaps
- Onboarding wizards do not remember profile steps when the app is backgrounded. Learners must repeat the entire sequence after interruptions.
- Search results show duplicate cards because filters are not applied consistently. Users lose confidence in the catalogue.
- Accessibility settings (font size, dyslexic-friendly mode) are static toggles without preview, forcing trial-and-error with little guidance.
- Notification centre lacks grouping or read-state management. Important announcements are buried beneath marketing nudges.
- The learning streak widget resets without explanation when the device date changes (travel/timezone shifts), frustrating committed learners.

### Additional Error Handling Concerns
- API timeouts display generic "Something went wrong" modals with no retry action, leading to app abandonment.
- File attachments in assignments fail silently when storage permissions are denied. There is no prompt guiding learners to update device settings.
- Payment failures return to the home screen without receipts or status, causing duplicate charges as users retry blindly.
- Deep linking from emails breaks when the app is already running, producing blank screens due to navigator stack mismanagement.
- Background sync crashes the app on slow networks because there is no throttling or cancellation support.

### Additional Integration Risks
- Push notification tokens are not refreshed on app reinstall; backend retains stale tokens and cannot reach returning learners.
- Social login flows depend on deprecated SDK versions. Upcoming platform policy changes will break authentication without warning.
- In-app messaging claims to integrate with the community backend, yet REST endpoints differ (`/community` vs `/communities`). Messages never load.
- Payment SDK integration lacks region-specific compliance flows (e.g., Strong Customer Authentication), blocking EU learners from subscribing.
- Deep links for classroom join rely on universal links that are unverified with Apple/Google. Links fall back to browser flows, degrading experience.

### Additional Security Findings
- Access tokens are stored in shared preferences without encryption. Rooted devices can extract credentials easily.
- The app bundles third-party analytics with broad data collection scopes without consent prompts, exposing privacy liabilities.
- Jailbreak/root detection is absent despite commitments to protect exam integrity.
- Screenshots are unrestricted even in proctored modes, contradicting exam policies.
- Debug logs are left enabled in release builds, leaking API endpoints and device identifiers.

### Additional Alignment Concerns
- Product positioning highlights social learning, yet the mobile app hides community discussions behind a feature flag that defaults off.
- Roadmaps tout microlearning streak incentives, but there are no push reminders or gamified badges implemented.
- The accessibility statement promises voiceover support, yet key navigation components lack semantics compatible with TalkBack/VoiceOver.
- Marketing guarantees synchronous parity with web dashboards, but the mobile analytics tab only shows high-level summaries.
- The retention strategy mentions habit-forming nudges, but there is no experimentation framework or A/B testing instrumentation in the app.
### Full Stack Scan Results
- The learner Flutter app bundles outdated `webview_flutter` and `firebase_auth` versions that trigger breaking changes under the latest Firebase SDK. Authentication flows crash on launch when compiled with current dependencies.
- Integration tests for deep links are absent. Manual testing shows universal links fail to route to the correct screens, undermining the promised seamless content handoff from marketing campaigns.
- Static analysis identifies unhandled futures around download and offline sync operations. Users encounter silent failures when network connectivity drops mid-transfer.
- The app references experimental feature flags that do not exist in the backend. Enabling them locally surfaces dead-end menus and broken calls, mirroring integration concerns.

### Operational Resilience Review
- Analytics batching is misconfigured; events queue indefinitely because background isolates are killed by the OS. There is no retry or flush strategy, rendering product metrics unreliable.
- The release pipeline lacks automated screenshots or accessibility snapshots. Store submissions risk rejection because compliance evidence (for VoiceOver, TalkBack) is missing.
- Crashlytics is integrated but disabled in debug and release builds through mis-set `isCrashlyticsCollectionEnabled`. Issues remain invisible to engineering.
- Offline content expiry timers do not sync with backend policies. Learners retain paid content beyond entitlement windows, creating licensing liabilities.

### Alignment Follow-up
- Marketing collateral touts "adaptive learning journeys" driven by ML, yet the app displays static recommendations. Without dynamic content, user trust in personalised experiences erodes.
- Roadmaps promise "privacy-first" operation, but telemetry consent flows are hidden under settings instead of onboarding, breaching regulatory guidance for explicit opt-in.
