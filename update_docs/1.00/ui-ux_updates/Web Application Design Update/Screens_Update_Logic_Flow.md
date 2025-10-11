# Screen Logic Flow Specification – Version 1.00

## SCR-00 Home
- **Entry Conditions:** Anonymous or returning user hitting `/` with optional `audience` query.
- **Data Fetch:** `GET /api/home?audience={learner|provider|enterprise}` returns hero copy, featured courses, testimonials, partner logos.
- **Interaction Nodes:**
  1. Hero CTA → route `/onboarding` for new visitors, `/dashboard` for authenticated.
  2. Secondary CTA (View Courses) pushes `/learn` with pre-filter tags applied.
  3. Testimonial carousel arrows update index state; auto-rotate 6s with pause on hover.
  4. Newsletter submission posts to `/api/newsletter` with inline success toast.
- **Exit Paths:** On CTA success or manual navigation via header.

## SCR-01 Onboarding Wizard
- **Entry:** Redirect from hero CTA or direct link with `step` param.
- **State Machine:**
  - Step 1 Goals → Step 2 Skills → Step 3 Schedule → Step 4 Summary.
  - Each step validates required fields (see `Forms.md`).
  - `Next` button disabled until validation passes.
- **API Interactions:** Save partial data to `/api/onboarding` after each step (PATCH). Summary step posts to `/api/onboarding/complete` then navigates to `/dashboard`.
- **Edge Cases:** If user exits mid-flow, show resume banner on home & dashboard.

## SCR-02 Dashboard
- **Entry:** Authenticated user.
- **Data Fetch:** Parallel requests to `/api/insights`, `/api/tasks`, `/api/announcements`, `/api/recommendations`.
- **Realtime:** WebSocket channel `dashboardUpdates` merges KPI deltas and notifications.
- **Interactions:**
  - Filter chip row updates KPI query; persist query params.
  - Drag-and-drop of widgets triggers `POST /api/dashboard/layout`.
  - Task completion toggles send `PATCH /api/tasks/:id` with optimistic update.
- **Exit:** Deep links to Learn Library, Communities, Course detail.

## SCR-03 Learn Library
- **Filters:** Query state stored in URL (`?search=&level=&duration=`). Auto-suggest uses `/api/search/suggest` on input >2 chars.
- **Result Loading:** Infinite scroll with IntersectionObserver triggering `GET /api/courses?page=n`.
- **Interactions:** Save for later toggles `POST /api/library/save` with toast feedback; playlist sidebar updates order via drag.
- **Modal:** Quick preview modal fetches `/api/courses/:id/preview` and allows enrolment.

## SCR-04 Course Detail
- **Hero CTA:** `Enrol` (if not enrolled) or `Resume` (if enrolled). Enrol posts to `/api/enrolments` then refreshes data.
- **Syllabus Accordion:** Expand/collapse storing local state; `Start lesson` routes to `/lesson/:lessonId` with prefetch.
- **Reviews Tab:** Paginates `GET /api/reviews?courseId=` with rating filter.
- **Edge:** If course archived, show banner and disable enrol with tooltip.

## SCR-05 Lesson Player
- **Data Pipeline:** Preload lesson metadata, video URL (HLS manifest), transcript, downloadable resources.
- **Player Controls:** Playback speed (0.5x–2x), skip 10s, chapter markers (timestamps).
- **Autosave:** Every 30s or on section change send `POST /api/progress`.
- **Notes Drawer:** Markdown editor using autosave to `/api/notes` with offline queue.
- **Completion:** When 95% watched, mark complete and show "Next lesson" card.

## SCR-06 Communities Hub
- **Data:** `/api/communities?joined=true`, `/api/communities/trending`, `/api/events/upcoming`.
- **Tabs:** Content filtered by topic; maintain scroll position per tab.
- **Feed Composer:** Rich-text composer with attachments (images up to 5MB) uploading to S3 via signed URL.
- **Events:** RSVP opens modal, POST to `/api/events/:id/rsvp` and adds to calendar service.

## SCR-07 Community Detail
- **Hero:** Configurable banner image, stats callout. Admin-only controls (Edit, Invite) gated by role.
- **Feed:** Uses same component as hub but scoped to community ID.
- **Pinned Resources:** `GET /api/communities/:id/resources`; clicking opens side drawer.
- **Members List:** Virtualised list for >200 members, search filter client-side.

## SCR-08 Profile
- **Sections:** Hero (cover image, avatar), Achievements (badges), Timeline (activity feed), Skills heatmap (radar chart).
- **Edit Flow:** Inline edit icons open modal forms; after save, show toast and highlight updated row.
- **Sharing:** `Copy profile link` uses clipboard API with fallback text selection.

## SCR-09 Settings
- **Tabbed Navigation:** Query `?tab=` persists selection. Content lazy loads modules.
- **Form Handling:** Auto-save toggles; destructive actions require password re-entry via confirmation modal.
- **Audit Trail:** Security tab lists devices; removal triggers `DELETE /api/devices/:id`.

## SCR-10 Support
- **Information Architecture:** Accordion for FAQs, contact cards linking to live chat (launches Intercom widget), and ticket form.
- **Ticket Submission:** `POST /api/support/tickets`; success shows case ID and timeline card appended to list.

## SCR-11 Admin Analytics
- **Filters:** Date range picker, cohort selector, metric toggles.
- **Data Sources:** GraphQL query `analyticsDashboard` returning KPIs, charts, tables.
- **Export:** CSV export button triggers asynchronous job, displays toast with download link when ready.

## SCR-12 Admin Content
- **Table:** Virtualised list of courses with status chips, instructor, updated date.
- **Bulk Actions:** Checkbox selection; toolbar appears with Publish, Archive, Assign Owner options (POST operations).
- **Detail Drawer:** Slide-over on row click showing metadata, preview, audit history.

## Global Logic Considerations
- All screens respect `prefers-reduced-motion` to disable parallax and heavy animations.
- Error boundaries wrap modules and display inline fallback cards.
- Authentication guard redirects unauthenticated users to `/auth/login` preserving `redirect` param.
