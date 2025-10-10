# Profile Styling Guidelines – Web Application v1.00

## Typography
- Name: Clash Display 32px/38px, -0.01em letter spacing.
- Role/Headline: Inter SemiBold 16px uppercase.
- Bio: Inter Regular 16px/26px, max width 640px.
- Timeline items: Title 18px/26px, body 16px/24px.

## Colours
- Header overlay: `rgba(11,17,32,0.72)` gradient.
- Avatar border: `linear-gradient(135deg, #4C7DFF, #A78BFA)`.
- Stats cards background: `rgba(76,125,255,0.12)` with border `rgba(76,125,255,0.24)`.
- Timeline line: `rgba(148,163,184,0.32)` with accent nodes `#4C7DFF`.

## Components
- Badge carousel uses 80px circles with drop shadow `0 16px 32px rgba(8,18,36,0.32)`.
- Skills chips: pill style, background `rgba(167,139,250,0.16)`, text `#A78BFA`.
- Quick action buttons: Secondary variant (ghost) with icons left.

## Layout
- Content card overlaps cover by -64px, padding 32px, radius 24px.
- Stats row uses CSS grid with `grid-template-columns: repeat(auto-fit, minmax(140px, 1fr))`.
- Timeline uses 2-column layout: left for metadata (80px width), right for content.

## Interactions
- Hover on badges reveals tooltip (delay 120ms) with achievements details.
- Timeline items expand/collapse for long content with smooth 180ms height animation.
- Quick actions show ripple effect (8px spread) using pseudo-element.

## Accessibility
- Provide alt text for cover images via `profile.coverAlt` field.
- Ensure high contrast for text on overlay (check ratio >4.5:1).
- Focus states use `outline: 2px solid #38BDF8; outline-offset: 4px`.
