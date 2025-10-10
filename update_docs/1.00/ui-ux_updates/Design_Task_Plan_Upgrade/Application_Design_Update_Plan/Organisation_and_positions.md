# Organisation and Positions

## Layout Grid
- Employ a 4pt base grid with 12-column structure on tablet and adaptive stacked layout on phones.
- Maintain safe area padding (24px top/bottom) to accommodate device notches and gesture bars.
- Anchor floating actions (FABs) to bottom-right on phones with 72px spacing from edges.

## Navigation Shell
- Persistent top app bar with dynamic title, search icon, and contextual actions; collapses on scroll to maximise content space.
- Bottom navigation with up to five primary destinations; label text always visible for clarity.
- Slide-over drawers for secondary modules (notifications, quick actions) using 90% screen height modal sheets.

## Dashboard Organisation
- Row 1: Hero metrics + quick actions.
- Row 2: Activity feed (left) and tasks/alerts (right) on tablet; stacked sequentially on phones.
- Row 3: Recommendations and community highlights; horizontally scrollable carousels with snap points.

## Detail Screen Layouts
- Media viewer uses split vertical stack: content viewer top, insights drawer bottom.
- Community hub features segmented tabs pinned beneath header for Channels, Events, Members.
- Settings adopt grouped sections with sticky headers for faster scanning.

## Orientation Considerations
- Landscape mode exposes dual-pane layout for tablets; on phones limit to video playback or split view for notes.
- Ensure modal sheets respect orientation changes without data loss.
