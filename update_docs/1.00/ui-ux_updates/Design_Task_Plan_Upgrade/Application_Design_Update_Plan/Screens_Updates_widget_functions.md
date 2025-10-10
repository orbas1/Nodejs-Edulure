# Widget Functions — Behaviour Specifications

## Hero Banner
- Fetches personalised data (streak, recommended course) via `/api/home/summary`.
- Collapses from 280 dp to 120 dp on scroll, keeping CTA visible.
- Includes animated progress arc (updates on completion events).

## Focus Tiles
- Display next two actionable tasks from task engine.
- Each tile surfaces CTA button and secondary text; pressing logs analytics event `focus_tile_tap`.
- Supports long-press to reorder priorities (drag reorder with haptic feedback).

## Carousel Cards
- Auto-scrolls to show new content; pauses on user interaction.
- Each card includes bookmark icon; tapping toggles saved state with immediate visual feedback.
- Use virtualization to load max 3 cards ahead to preserve performance.

## Progress Meter
- Linear progress bar (Lesson Player) updates in real time as video/time consumed.
- Circular progress for streak resets daily at midnight local time; animation 1 s ease-out when streak increases.

## Tab Bar
- Each tab uses accessible segmented control; arrow keys move focus.
- Display badge count for new notifications using accent pill.

## Composer Sheet
- Rich text supports bold, italics, bullet lists, attachments (image, link).
- Validation ensures minimum 10 characters before enabling Post button.
- Provides emoji picker (sheet height 360 dp) with search.

## Timeline Stepper
- Each step has status (Complete, In Progress, Blocked). Status drives icon (check, spinner, alert).
- Tapping expands details with links to relevant screens.
- If blocked, show CTA “Resolve” linking to compliance checklist.

## Analytics Card
- Shows metric value, delta vs previous period, sparkline.
- Supports toggling between Week/Month via segmented control within card.
- Pressing “View details” deep links to Audience Insights with filter pre-applied.

## Notification Cell
- Swipe left reveals actions (Archive, Mark read). Swipe threshold 64 dp.
- Tap opens deep link; highlight background `primary/50` until user navigates back.
- Long-press enters multi-select mode.

## Download Manager Card
- Displays storage usage (progress bar) and two buttons: “Download all updates” and “Manage storage”.
- If storage low (<10%), triggers warning banner.

## Settings Accordion
- Lazy-load contents when expanded to reduce initial load.
- Remember expansion state in local storage.
- Each toggle sends immediate API request; show spinner while pending.

## Support CTA Card
- Contains contact methods (chat, email, knowledge base). Buttons open corresponding modals/links.
- Tracks `support_card_interaction` analytics event with method.

## Modal Dialog
- Focus trap ensures Tab cycling within modal.
- Primary button disabled until required inputs validated.
- ESC/back gesture closes modal with confirmation if unsaved changes.

## Bottom Sheet
- Draggable with 3 snap points (25%, 60%, 100%).
- Dim background `rgba(15, 23, 42, 0.3)`; dismiss on downward swipe beyond threshold.

## FAB
- Expands into radial menu with icons labelled (Upload, Event, Announcement / Resume, Scan QR depending on role).
- Supports long-press to reorder quick actions in settings.
- Animates rotation 45° when expanded.
