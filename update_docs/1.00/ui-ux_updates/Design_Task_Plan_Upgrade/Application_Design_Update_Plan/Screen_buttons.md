# Screen Buttons — Interaction Spec

## Button Styles
| Style | Height | Padding | Border Radius | Usage |
| --- | --- | --- | --- | --- |
| Primary Filled | 48 dp | 16 dp horizontal | 12 dp | High-priority actions (Resume, Publish).
| Secondary Outline | 48 dp | 16 dp | 12 dp | Alternative actions (Preview, Share).
| Tertiary Ghost | 44 dp | 12 dp | 12 dp | Low emphasis (Skip, Cancel).
| FAB | 64 dp | — | 24 dp | Floating quick action (Add, Resume scan).
| Icon Button | 40 dp | 8 dp | 12 dp | Standalone icons (Filter, Bookmark).

## State Colours
- **Primary:** Default `primary/500`, pressed `primary/600`, disabled `rgba(37, 99, 235, 0.35)` with text `rgba(15, 23, 42, 0.45)`.
- **Secondary:** Border `primary/500`, text `primary/500`. Hover fill `rgba(37, 99, 235, 0.08)`.
- **Ghost:** Text `primary/500`, background transparent; pressed `rgba(37, 99, 235, 0.05)`.
- **FAB:** Gradient fill as defined in `Colours.md`, drop shadow level 2.

## Iconography
- Use 24 dp icons aligned 4 dp from text baseline.
- Provide text label to the right except for icon-only buttons; ensure accessible name equals tooltip text.

## Placement by Screen
- **Home:** Primary button inside hero card (“Resume {{course}}”). Secondary ghost “Change goal”. FAB bottom-right launching Quick Resume.
- **Learn:** Primary at bottom of course detail (“Start learning”), secondary “Add to library”, tertiary “Share”. Sticky CTA bar once scrolled.
- **Lesson Player:** Primary `Next lesson`, secondary `Mark complete`, icon buttons for speed, captions.
- **Community:** Composer uses primary “Post update”; each post card has icon buttons for like/comment/share (40 dp). Moderator actions use secondary outline.
- **Provider Dashboard:** Primary “Create content” within FAB; analytics cards include tertiary “View details”.
- **Upload Wizard:** Sticky footer with secondary “Back”, primary “Next/Publish”.
- **Settings:** Primary “Save changes” appears at bottom of each accordion; destructive zone button `Delete account` uses error styling.

## Motion & Feedback
- Buttons animate scale 0.98 on press with spring back (200 ms).
- Loading state: inline spinner 20 dp left of label, text reduces opacity to 80%.
- Provide success micro-interaction (ripple outwards) for completion buttons.

## Accessibility
- Minimum target 48 × 48 dp; ensure 8 dp spacing between adjacent buttons.
- Provide focus ring 2 dp `info/500` with 4 dp corner radius expansion.
- Support keyboard shortcuts (e.g., `Cmd+Enter` to submit community post) noted in tooltip.

## Implementation Notes
- Document button variants in component library with tokens for background, text, border.
- Provide JSON mapping of button IDs to analytics event names.
