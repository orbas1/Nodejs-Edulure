# Widget Functional Specification – Version 1.00

## KPI Widgets (WGT-KPI)
- **Inputs:** `title`, `value`, `delta`, `trendData[]`, `comparisonRange`.
- **States:** default, loading (skeleton), error (retry icon), empty (placeholder text "Data sync in progress").
- **Interactions:** Hover reveals tooltip with trend breakdown; click drills into analytics module with query params.
- **Data Refresh:** Poll every 60s; update via WebSocket event `kpi:update` for push updates.

## Task Rail (WGT-Task-Rail)
- **Actions:** `complete`, `snooze`, `open details`.
- **Logic:** Completion toggles `completedAt` timestamp, moves item to Completed tab. Snooze opens modal to set remind time.
- **Accessibility:** Each row is `role="listitem"` with checkbox input labelled by task name.

## Filter Chips (WGT-Filter-Chips)
- **Behaviour:** Single-select or multi-select depending on context. Active chips show gradient border, ripple on tap.
- **Keyboard:** Arrow keys navigate, `Space` toggles selection.
- **Persistence:** Selected values stored in URL query string and local storage for quick return.

## Course Cards (WGT-Course-Card)
- **States:** default, hover (elevated shadow), saved (bookmark filled), locked (overlay with lock icon).
- **CTA Buttons:** Primary (View Details), tertiary (Preview) using tertiary link style.
- **Data Contracts:** Expect `courseId`, `title`, `instructor`, `duration`, `level`, `rating`, `thumbnail`, `tags[]`.

## Playlist Sidebar (WGT-Playlist)
- **Drag Handling:** Uses sortable list with keyboard support; `Enter` toggles drag mode, arrow keys reorder.
- **Progress Display:** Each item shows progress bar; completed lessons collapse to 50% opacity.
- **Persistence:** Layout saved via `POST /api/library/playlist`.

## Syllabus Accordion (WGT-Syllabus)
- **Behaviour:** Only one module open at a time on desktop; mobile allows multiple expanded.
- **Progress:** Each lesson line includes check icon and time; completed lessons greyed out.
- **Deep Link:** `Start` button routes to lesson with `state` for returning to module.

## Video Player (WGT-Video-Player)
- **Tech:** HLS playback using `video.js` with custom skin. Captions (.vtt) toggle via control bar.
- **Analytics:** Track play, pause, seek, complete events with timestamp metadata.
- **Error Handling:** On network error, show inline alert with retry; fallback to downloadable MP4 link.

## Transcript Pane (WGT-Transcript)
- **Sync:** Highlights current paragraph using timecode mapping; user clicking paragraph seeks video.
- **Search:** Inline search bar filters transcript; results highlight term.
- **Accessibility:** Provide keyboard shortcuts `Ctrl/Cmd + F` to focus search.

## Notes Drawer (WGT-Notes)
- **Editor:** Markdown with live preview toggle. Autosaves with debounce 2s.
- **Organisation:** Notes grouped by lesson; allow tags. Provide export to Markdown file.
- **Offline:** Queue notes in IndexedDB when offline; sync on reconnect.

## Feed (WGT-Feed)
- **Content:** Supports text, image carousel (max 4), file attachments (PDF). Mentions using `@` auto-complete.
- **Moderation:** Flag action opens modal; flagged posts send to admin queue.
- **Real-time:** Subscribes to `feedUpdates` GraphQL subscription for new posts/comments.

## Event Calendar (WGT-Event-Calendar)
- **Views:** Toggle between month and agenda view. Month view shows dots for event types.
- **Interactions:** Clicking date opens event list; RSVP button inline.
- **Integrations:** `Add to Calendar` exports `.ics` file.

## Chat Dock (WGT-Chat-Dock)
- **States:** Collapsed (icon + unread badge), expanded (thread list + composer).
- **Real-time:** WebSocket channel `communityChat`. Supports typing indicators.
- **Accessibility:** Focus trap inside expanded state, `Esc` collapses.

## Stats Callout (WGT-Stats-Callout)
- **Data:** Accepts `label`, `value`, `trend`, optional `icon`.
- **Visuals:** Animated count-up on load (1.2s) respecting reduced-motion.
- **Interactions:** Tooltip shows definition sourced from `/api/glossary`.

## Members List (WGT-Members-List)
- **Virtualisation:** Render 20 rows at once; infinite scroll.
- **Actions:** Row click opens profile preview; admin can adjust role via inline dropdown.
- **Search:** Debounced 300ms query filtering on client.

## Settings Tabs (WGT-Settings-Tabs)
- **Keyboard Support:** `Tab` moves across tabs, `ArrowLeft/Right` reorders focus, `Enter` activates.
- **Responsive:** Collapses to segmented control on tablet, stacked on mobile.
- **State:** Persist active tab in session storage.

## Form Table (WGT-Form-Table)
- **Structure:** Column headers = channels, rows = notification events.
- **Input Type:** Switch toggles; header switch toggles entire column.
- **Validation:** Show warning toast if all channels disabled for critical events.

## FAQ Accordion (WGT-FAQ)
- **Animation:** Expand/collapse 200ms ease; arrow icon rotates 90°.
- **Content:** Each answer supports inline links and emphasised callouts.
- **Accessibility:** Use `aria-expanded` and `aria-controls` per item.

## Ticket List (WGT-Ticket-List)
- **States:** Open, Pending, Resolved, Escalated with colour-coded badges.
- **Interaction:** Clicking opens detail modal; attachments accessible via inline chips.
- **Sorting:** Default sort by updated date; user can toggle to priority.

## Analytics Board (WGT-Analytics-Board)
- **Layout:** Masonry with drag reorder; each card identifies metric type (line, bar, table).
- **Drilldown:** `View detail` link adds filter to query string.
- **Performance:** Lazy-load charts when 200px away from viewport (IntersectionObserver).

## Content Table (WGT-Content-Table)
- **Columns:** Checkbox, Course title, Status, Owner, Updated, Metrics.
- **Interactions:** Column sort, column visibility toggles, row selection with shift-click.
- **Empty State:** Encourage creation with CTA linking to course builder.

## Bulk Toolbar (WGT-Bulk-Toolbar)
- **Actions:** Publish, Archive, Assign Owner, Export selection.
- **Feedback:** After action, show toast and update row statuses.
- **Accessibility:** Entire toolbar `role="region"` with label "Bulk actions".

## Detail Drawer (WGT-Detail-Drawer)
- **Structure:** Header with actions, tabbed body (Overview, Curriculum, Audit Log).
- **Controls:** `Esc` closes, `Cmd/Ctrl + Enter` saves changes when editing.
- **Persistence:** On close, check unsaved changes; prompt with confirmation modal.
