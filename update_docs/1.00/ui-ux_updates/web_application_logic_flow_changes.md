# Version 1.00 Web Application Logic Flow Changes

## 1. Visitor to Prospect Journey
1. Visitor lands on homepage; hero CTA options tracked (Explore vs. Talk to sales).
2. Selecting “Explore” scrolls to product tour tabs; each tab selection loads relevant content via AJAX to maintain page speed.
3. If visitor submits newsletter form, validation ensures consent checkbox ticked before enabling submit. Success shows confirmation message and triggers CRM automation.
4. “Talk to sales” opens modal with multi-step form; submission posts to CRM and shows success page with scheduling link.

## 2. Authentication & Account Transition
1. When visitor clicks Sign In, system checks session; if not authenticated, redirects to login screen.
2. Login form uses inline validation; on success, determines role (learner/provider) and routes to appropriate dashboard.
3. If multi-factor enabled, prompts for code before final redirect. Failure path surfaces error message and support link.
4. Post-login banner suggests installing mobile apps and provides handoff button to open respective experiences.

## 3. Personalised Homepage (Logged-In State)
1. Authenticated users see personalised feed. Server composes modules: Continue Learning, Community Highlights, Recommendations, Events.
2. Continue Learning pulls from progress service; clicking resume launches in-app viewer (same tab) with query parameters for context.
3. Recommendations call recommendation engine with user profile features; cards include Save/Follow CTAs with optimistic UI updates.
4. Scroll events tracked for module visibility; lazy-loaded sections fetch when entering viewport to reduce initial payload.

## 4. Explorer Search & Filtering
1. Search query initiated from header; client sends debounced request to Meilisearch service returning mixed entities.
2. Tabs (Courses, Communities, People, Assets) filter dataset client-side; additional filters (price slider, duration) trigger backend request for refined results.
3. Selecting card opens detail overlay with summary, preview media, and CTAs (Enroll, Join, Follow). Actions confirm via modal or inline toast.
4. Save action stores item in user’s library; analytics records search term, filters, and conversions.

## 5. Community Hub & Moderation
1. Selecting community loads hub with feed, events, resources. Data fetched via GraphQL with caching to support quick tab switching.
2. Posting content opens composer overlay; attachments upload to storage with progress indicator before posting.
3. Moderators access moderation drawer; decisions (approve, remove, escalate) update queue and trigger notifications to content authors.
4. Event creation flow mirrors provider logic: modal collects details, validates tier access, schedules notifications.

## 6. Monetisation & Affiliate Workflows
1. Providers access Monetise section from console navigation. Dashboard displays revenue widgets and payout status.
2. Initiating payout onboarding opens embedded payment provider iframe; upon completion, status updates to “Verified”.
3. Creating affiliate offer triggers modal capturing product selection, commission, validity. Submission posts to monetisation service and displays confirmation card.
4. Earnings reports downloadable via CSV; request shows spinner and triggers file generation service with email fallback.

## 7. Settings & Integrations
1. Settings page loads sections asynchronously to reduce bundle size. Default tab shows Account details with edit forms.
2. Notification preferences stored per channel (email, push, in-app). Changes auto-save and show toast confirmation.
3. Privacy tab allows exporting data; request triggers job creation and sends email when ready. Cancel action available until job starts.
4. Integrations tab lists API keys; generating new key reveals confirmation modal, logs to audit trail, and displays masked key with copy button.

## 8. Support & Help Centre
1. Help centre search uses auto-suggest; selecting article loads detail view with breadcrumb.
2. Users can rate article helpfulness; negative feedback opens follow-up form for additional context.
3. Contact support form collects category, description, attachments; submission creates ticket and shows case ID.
4. Live chat widget available for authenticated providers; offline hours convert to email form automatically.

## 9. Accessibility & Performance Considerations
1. Skip-to-content link activates on first tab press; ensures keyboard users can bypass navigation.
2. High-contrast mode toggle persists preference via cookies; on activation, CSS variables switch to high-contrast palette.
3. Lazy loading of hero video ensures LCP target <2.5s; fallback image served for slow connections.
4. All modals trap focus and close on ESC, ensuring compliance with WCAG 2.1.

## 10. Marketing Campaign & Tracking Logic
1. Landing pages embed UTM-aware CTAs that propagate parameters through signup and checkout flows for attribution.
2. Announcement banners scheduled via CMS; when active, they render in header with dismiss state stored in local storage per campaign ID.
3. Scroll depth and interaction events pushed to analytics to evaluate content engagement; data feeds into optimisation dashboards.

## 11. Self-Serve Trial & Checkout
1. Trial form submissions trigger account pre-provisioning; system emails verification link and displays confirmation state.
2. Checkout flow integrates payment gateway with tokenised cards; errors surfaced inline with guidance for resolution.
3. Post-purchase tasks include inviting teammates, connecting integrations, and scheduling onboarding; completion tracked via checklist with progress indicator.

## 12. Content Management & SEO Workflows
1. CMS editors manage pillar pages with block-based editor; publishing updates static site data and invalidates CDN cache.
2. Glossary interactions load definitions dynamically to minimise initial payload; state persists scroll position for improved UX.
3. Sitemap and structured data updated nightly to reflect new resources, ensuring search engines capture latest content.

## 13. Incident & Maintenance Communication
1. Maintenance mode triggered via feature flag; renders full-screen message while preserving ability to access status page.
2. Incident banner fetches from status API; acknowledgement hides banner for session but reappears if status worsens.

## 14. Embedded Demo & Iframe Handling
1. Demo modules load sandboxed iframe with persona toggles; switching persona swaps dataset via postMessage without reload.
2. Loading skeleton displayed until iframe ready message received; if timeout occurs, fallback video tutorial shown.

## 15. Live Classroom & Tutor Hire Flow
1. Learner selects “Book session” on tutor storefront; system fetches availability slots, filters by learner timezone, and locks slot tentatively for five minutes while payment/ticket details collected per `Logic_Flow_map.md`.
2. Conflict detection runs in real time; if tutor slot no longer available, learner receives contextual error with alternative suggestions and waitlist CTA; confirmation triggers booking creation and sends notifications to tutor and learner.
3. Tutor dashboard surfaces booking with preparation checklist (agenda upload, resources, moderation preferences) referencing `provider_application_logic_flow_changes.md`; tutors can accept, reschedule, or decline with reason codes logged for analytics.
4. 30 minutes before session, lobby opens; learners run audio/video checks, view agenda, and see countdown. Agora token requested on join; if environment variables missing, UI surfaces support contact and fallback instructions.
5. During session, host controls manage mute-all, spotlight, poll launch, and chat moderation; co-hosts promoted from roster. Incident actions (remove, report) log audit events and display confirmation to moderators per `Admin_panel_drawings.md`.
6. Session end triggers summary generation: attendance metrics, chat export, recordings, and feedback survey link. Tutor receives payout readiness prompt (mark complete, add notes), while learners see follow-up resources and review request.

## 16. Commerce Checkout & Refund Flow
1. Learner initiates checkout from cart/CTA; order builder preloads selected courses, ebooks, and live class tickets, computes subtotal, and fetches applicable coupons/taxes from `/api/commerce` while reflecting jurisdiction logic documented in `Logic_Flow_map.md` and `web_app_wireframe_changes.md`.
2. User applies coupon; UI validates via `/api/commerce/orders` preview, surfaces success or error toast, updates totals, and toggles finance support link referencing `Screen_text.md` copy.
3. Learner selects Stripe or PayPal; Stripe path renders Elements (card, billing details) with inline validation and 3DS fallback, while PayPal launches approval pop-up. Both log analytics checkpoints defined in `Screens_Updates_widget_functions.md`.
4. On payment confirmation, UI polls capture endpoint for final status, transitions to success screen with receipt download, onboarding CTAs, and compliance copy referencing `dashboard_drawings.md`. Failures render recovery states guiding retry or alternate method selection.
5. Learner initiates refund via order history; modal collects reason, posts to refund endpoint, and updates timeline with pending/refunded states while notifying finance team and surfacing SLA copy from `text.md.md`.
6. Finance admins monitor settlement dashboard: webhook health alerts and reconciliation widgets update in real time, enabling manual capture or dispute logging flows aligned to `Admin_panel_drawings.md`.
