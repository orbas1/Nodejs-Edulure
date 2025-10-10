# Screens Update

## Overview
- Prioritise dashboards, media viewers, community hubs, explorer, and settings for alignment with Version 1.50 initiatives.
- Adopt modular component library to reuse headers, stats cards, leaderboards, and chat docks across mobile and web shells.
- Ensure each screen supports offline continuity, quick actions, and cross-device sync cues.

## Screen Blueprints

### Provider Dashboard (PD-01)
```
┌───────────────────────────────────────────────────────────────┐
│Top Bar (A1)      │Role Switcher (A2)        │Support Icon (A3)│
├───────────────┬───────────────┬───────────────────────────────┤
│Hero Metric (B1)│Hero Metric (B2)│Hero Metric (B3)              │
├───────────────┴───────────────┴───────────────────────────────┤
│Conversion Timeline (C1)                                        │
├───────────────┬────────────────┬──────────────────────────────┤
│Quick Actions  │Community Pulse │Revenue Trend (D1)            │
│Tray (D0)      │Card (D2)       │                               │
├───────────────┴────────────────┴──────────────────────────────┤
│Tasks List (E1)│Insights Feed (E2)                              │
└───────────────┴───────────────────────────────────────────────┘
```

| ID  | Component | Widget Type | Dimensions | Positioning | Interaction / Effects |
| --- | --- | --- | --- | --- | --- |
| A1  | App bar title + breadcrumb | System Header | 56px height, full width | Anchored top, safe area padding 16px | Scroll condenses to 44px, drops subtle shadow. |
| A2  | Role switch segmented control | Action Widget | 96px width | Right of title, aligned baseline | Toggles provider/analyst roles; animates underline 180ms. |
| A3  | Support assistant icon button | System Widget | 44px container | Top bar trailing edge | Long press opens contextual tips sheet. |
| B1-B3 | KPI hero cards | Analytics Widget | 160×120px | 3-column grid, 16px gap | Number flip animation on update, includes trend arrows. |
| C1  | Conversion timeline carousel | Media Widget | 100% width × 140px | Below hero row | Horizontal scroll with snap-to-card; progress line animates on load. |
| D0  | Quick actions tray | Action Widget | 3 pills × 120×64px | Left column under timeline | Pills lift with 4px shadow and scale 1.03 on tap. |
| D1  | Revenue trend chart | Analytics Widget | 2 columns × 200px height | Right lower quadrant | Tooltip scrubbing, area chart fades between day/week view. |
| D2  | Community pulse | Social Widget | 1 column × 200px | Middle column | Chips display flagged items; pressing opens Community Hub filtered view. |
| E1  | Tasks list | System Widget | 1 column × flexible | Bottom left | Checklist with swipe-to-complete and haptic tick. |
| E2  | Insights feed | Content Widget | 2 columns × flexible | Bottom span | Cards fade in sequentially, support "save" microinteraction. |

### Media Library (PD-02)
```
┌─────────────────────┬─────────────────────────────────────────┐
│Search & Filters (A1)│ Bulk Actions Bar (A2)                  │
├───────────────────────────────────────────────────────────────┤
│Status Tabs (B1)                                               │
├───────────────┬───────────────┬───────────────┬───────────────┤
│Media Card (C1)│Media Card (C2)│Media Card (C3)│Media Card (C4)│
├───────────────┴───────────────┴───────────────┴───────────────┤
│Version Drawer (D1)│Metadata Panel (D2)                        │
└───────────────────┴───────────────────────────────────────────┘
```

| ID  | Component | Widget Type | Dimensions | Positioning | Interaction / Effects |
| --- | --- | --- | --- | --- | --- |
| A1 | Search input + filter icon buttons | System Widget | 48px height | Docked top | Expands into advanced search sheet when swiped down. |
| A2 | Bulk action bar | Action Widget | 48px height | Sticky below filters when selection active | Slide-in from top with vibrancy blur. |
| B1 | Status tabs (All, In Review, Published, Archived) | Navigation Widget | 4 tabs | Under search |  Indicator slides; displays badge counts. |
| C1-C4 | Media cards | Media Widget | 168×220px | 2-column grid on phone, 4-col on tablet | Hold to multi-select, includes status chip + progress ring. |
| D1 | Version drawer | System Widget | 320px sheet | Slides from bottom on card tap | Displays timeline with diff highlights. |
| D2 | Metadata panel | Forms Widget | 320px width (tablet) or overlay card | Right side / overlay | Allows inline edits; autosaves with toast feedback. |

### Learner Home Feed (LR-01)
```
┌───────────────────────────────────────────────────────────────┐
│Greeting + Avatar (A1)        │Streak Chip (A2)               │
├──────────────────────────────┴────────────────────────────────┤
│Resume Carousel (B1)                                           │
├───────────────────────────────────────────────────────────────┤
│Community Highlights Stack (C1)│Recommended Explorer Grid (C2)│
├──────────────────────────────┬────────────────────────────────┤
│Events Strip (D1)             │Support CTA (D2)               │
└──────────────────────────────┴────────────────────────────────┘
```

| ID  | Component | Widget Type | Dimensions | Positioning | Interaction / Effects |
| --- | --- | --- | --- | --- | --- |
| A1 | Personalized greeting block | Content Widget | 64px height | Top safe area | Scroll transforms to compact pinned title. |
| A2 | Streak chip | Gamification Widget | 96×40px | Inline with greeting | Pulse animation on streak change; accessible alt text for screen readers. |
| B1 | Resume carousel | Media Widget | 100% width × 160px | Under header | Snap scrolling with parallax card depth; includes progress indicator on card bottom. |
| C1 | Community highlight stack | Social Widget | 1 column × 2 cards | Left column | Cards swap every 6s; tapping opens Community Space filtered view. |
| C2 | Recommended explorer grid | Media Widget | 2 column grid | Right column | Each tile houses cover art, difficulty chip, and CTA button. |
| D1 | Event strip | Social Widget | Horizontal list | Lower left | Countdown badges update each minute; allows quick RSVP. |
| D2 | Support CTA | System Widget | 100% width pill | Lower right | Launches support chat; glows subtly when new guidance available. |

### Media Viewer (LR-02)
```
┌───────────────────────────────────────────────────────────────┐
│Header (Back, Title, Progress) (A1)                            │
├───────────────────────────────────────────────────────────────┤
│Primary Canvas (Slides/Ebook/Audio Waveform) (B1)             │
├───────────────┬───────────────────────────────────────────────┤
│Annotation Rail│Discussion Drawer Toggle (C1)                 │
│(C0)           │                                               │
├───────────────┴───────────────────────────────────────────────┤
│Transport Controls (D1)│Notes Panel (D2)                      │
└───────────────────────┴───────────────────────────────────────┘
```

| ID  | Component | Widget Type | Dimensions | Positioning | Interaction / Effects |
| --- | --- | --- | --- | --- | --- |
| A1 | Collapsible media header | System Widget | 64px height | Pinned top | Auto-hides on scroll, reveals on tap; includes progress ring around avatar. |
| B1 | Media canvas | Media Widget | Flexible | Center | Supports pinch-to-zoom, page slider; audio uses waveform with chapter markers. |
| C0 | Annotation rail | Action Widget | 56px wide vertical | Left edge | Houses pen/highlight/comment icons; expands to 120px on long press showing colour palette. |
| C1 | Discussion toggle | Social Widget | Overlay button | Right mid | Slides comment drawer from right; shows unread badge. |
| D1 | Transport controls | System Widget | 72px height | Bottom fixed | Contains play/pause, skip, playback speed; haptic feedback on toggle. |
| D2 | Notes panel | Content Widget | 40% height sheet | Bottom overlay | Accepts rich text, voice note; sync indicator pulses during upload. |

## Cross-Cutting Elements
- Shared notification inbox, search overlay, and quick create modal accessible from any screen, each adopting 16px safe area padding and 8px elevation for floating layers.
- Integration of support assistant accessible via floating help icon providing contextual FAQs; icon anchored at 72px above bottom safe area to avoid FAB collision.
- Deep link handling ensures push notifications route users to correct nested views without losing state; provide toast confirmation when context restored after relaunch.
