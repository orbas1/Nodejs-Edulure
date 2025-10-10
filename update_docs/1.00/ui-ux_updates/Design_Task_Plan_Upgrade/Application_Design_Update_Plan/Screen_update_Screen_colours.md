# Screen Colours — Applied Palettes per Screen

| Screen | Background | Key Accent | Supporting Colours | Notes |
| --- | --- | --- | --- | --- |
| Home | `neutral/25` base with hero gradient (`primary/600` → `secondary/500`) | `accent/500` for streak pill | `success/500` for streak success, `info/500` for tips | Switch hero gradient to `dark/background` mix when dark mode.
| Learn Catalogue | `neutral/25` | `primary/500` for CTA, `accent/600` for filter chips | `neutral/100` for card borders | In dark mode use `dark/surface` cards with `dark/primary` text.
| Lesson Player | Full-bleed media background darkened with `rgba(15,23,42,0.65)` overlay | `primary/500` for progress bar | `accent/500` for transcript toggle, `neutral/50` text on overlay | When captions on, highlight icon with `accent/600` glow.
| Community Feed | `neutral/25` | `secondary/500` for tab indicator | `info/500` pinned posts, `warning/500` moderation banners | Post background `#FFFFFF` / `dark/surface`.
| Library | `neutral/25` | `primary/500` folder icons | `accent/500` download badges | Offline banner uses `warning/100` background with `warning/500` text.
| Profile | `neutral/25` gradient top `linear(120°, #2563EB, #22D3EE)` | `accent/500` stats chips | `success/500` for achievements | Dark mode gradient uses `#1E3A8A → #7C3AED`.
| Settings | `neutral/25` | `accent/500` toggles | `neutral/100` dividers, `error/500` destructive zone | High contrast mode flips background to `#FFFFFF` with 2 dp outlines.
| Notifications | `neutral/25` | `primary/500` filter pill | `info/500` info toasts, `warning/500` urgent alerts | Use tinted backgrounds for severity.
| Provider Dashboard | `neutral/25` with background wash `rgba(11,17,32,0.04)` | `primary/500` analytics cards | `secondary/500` for campaign prompts | Earnings cards use `success/500` gradient overlay.
| Upload Wizard | `neutral/25` | Step indicator `primary/500` | `accent/500` toggles, `warning/500` warnings | Completed steps tinted `success/100`.

## Dark Mode Adjustments
- Replace `neutral/25` surfaces with `dark/background` and `dark/surface` tokens.
- Buttons adopt `dark/primary` fill with `dark/background` text.
- Use subtle border `rgba(96, 165, 250, 0.24)` to maintain separation.

## High Contrast Mode
- Remove gradients; use solid `#0B1120` background with white text.
- Outline cards with 2 dp `#FFFFFF`, text `#FFFFFF`, icons `#FFD166` for key actions.
- Provide toggle to preview in Settings.
