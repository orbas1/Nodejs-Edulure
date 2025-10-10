# Version 1.00 Learner Application Styling Changes

## Typography & Hierarchy
- **Primary headings:** Inter Display 700, 30px on desktop, 26px tablet, 22px mobile. Used for hero titles, section headers.
- **Secondary headings:** Inter 600, 20px with 1.4 line-height for card titles and module names.
- **Body copy:** Inter 400 at 16px base (web) / 15px (mobile) with 1.6 line-height to maintain readability on light background.
- **Supporting serif:** Source Serif Pro 500 for long-form reading within ebooks and quote blocks.
- **UI labels & chips:** Inter 600 uppercase 12px. Tab labels use 14px sentence case for better scanning.
- **Numbers:** Inter Tight 600 for progress percentages and leaderboard ranks to ensure alignment.

## Colour System
| Token | Hex | Usage |
| --- | --- | --- |
| `learner.bg.canvas` | #F8FAFC | Application background and large surfaces. |
| `learner.bg.surface` | #FFFFFF | Cards, sheets, modal surfaces with subtle borders. |
| `learner.bg.elevated` | #EEF2FF | Highlighted sections (active filters, hover states). |
| `learner.text.primary` | #0F172A | Primary text across light backgrounds. |
| `learner.text.secondary` | #475569 | Secondary copy, metadata, placeholders. |
| `learner.accent.primary` | #7C3AED | Primary CTA buttons (Resume, Join, Follow) and active chips. |
| `learner.accent.secondary` | #14B8A6 | Secondary actions, success highlights, toggles. |
| `learner.feedback.success` | #22C55E | Correct quiz states, streak achievements. |
| `learner.feedback.warning` | #F59E0B | Payment reminders, expiring downloads. |
| `learner.feedback.error` | #EF4444 | Subscription issues, failed downloads. |
| `learner.feedback.info` | #38BDF8 | Informational banners, tooltips. |
| `learner.border.default` | #E2E8F0 | Card outlines, divider lines. |
| `learner.shadow` | rgba(15, 23, 42, 0.08) | Card shadow on light background. |

## Component Styling
- **Buttons:** Pill shape (24px radius) with 16px horizontal padding. Primary buttons use solid `learner.accent.primary` with white text and subtle drop shadow. Hover darkens to #6D28D9; pressed state shortens shadow. Secondary buttons use outline style with `learner.accent.secondary` border.
- **Floating action buttons:** Circular 56px, gradient `#7C3AED → #14B8A6`, white icon. Drop shadow increases on hover.
- **Cards:** 16px radius, 20px padding. Shadow `0 10px 30px rgba(15, 23, 42, 0.06)` with hover translation (0, -2px). Active state adds border `#C4B5FD`.
- **Chips & Filters:** 12px uppercase text, 8px vertical padding, 12px horizontal. Selected chips use filled style with `learner.accent.primary`; unselected use outline with `learner.border.default`.
- **Progress indicators:** Course cards use circular progress ring with gradient fill; text displays completion percentage + estimated time. Ebook reader uses horizontal progress bar with gradient (#7C3AED to #C084FC).
- **Tabs:** Underline indicator 3px `learner.accent.primary`. Inactive tabs greyed (#94A3B8). Mobile tabs convert to segmented control with 8px radius.
- **List items:** 12px top/bottom padding, 16px spacing between avatar and text. Hover state uses `#EEF2FF` background.
- **Modals & Sheets:** Rounded 24px top corners, top drag handle for bottom sheets. Header includes icon, title, supporting copy.
- **Badges & Streaks:** Gradient backgrounds (#FDE68A to #F59E0B) with white text for streak counts. Achievement badges use illustrated icons with subtle glow.

## Media & Reading Experience
- **Ebook typography controls:** Provide four presets adjusting base font from 16–22px. Themes include Light, Sepia (#FDF6E3), Dark (#0B1120 background with #E2E8F0 text).
- **Video player:** Control bar uses semi-transparent dark overlay (#111827 80%). Active buttons tinted `learner.accent.secondary`.
- **Note editor:** Light grey background (#F1F5F9), 1px border. Selected text highlight uses `rgba(124, 58, 237, 0.24)`.

## Iconography & Illustration
- Icon set: Phosphor rounded style, 1.5 stroke weight. Primary icons tinted `learner.accent.primary`, secondary icons #94A3B8.
- Illustrations for empty states use soft gradients and friendly characters; maintain consistent padding (24px) and supportive copy.

## Motion & Feedback
- **Transitions:** Buttons 120ms ease-out; cards 160ms; modal sheet 220ms slide-up. Reduced-motion preference disables slide animations and uses fade.
- **Micro-interactions:** Progress ring animates from previous value to new value on update. Reaction buttons bounce slightly on tap.
- **Toasts:** Appear bottom centre on mobile, top-right on web. Use background `#0F172A` with white text; success toasts include accent-coloured progress bar.

## Accessibility & Inclusion
- Text contrast >4.5:1 across all states. For dark theme, `learner.text.primary` flips to #F8FAFC.
- Touch targets minimum 48px; sliding gestures use 12px safe area padding.
- VoiceOver/ TalkBack labels include action context (“Mute notifications – switch – on”).
- Focus rings 2px `#14B8A6` outer glow for keyboard navigation.

## Responsive & Theming
- Tablet layout reduces card padding to 16px and increases grid column width for readability.
- Mobile light theme default; dark theme available in settings. Theme toggle persists using local storage + server flag.
- Desktop web utilises max-width 1200px container with 40px gutters, ensuring comfortable reading width (~72 characters).
