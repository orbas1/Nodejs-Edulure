# Version 1.00 Web Application Styling Changes

## Design Tokens & Foundations
- **Typography scale:**
  - Display: Inter Display 700 at 48px (desktop), 40px (tablet), 32px (mobile) for hero headlines.
  - Headline: Inter 600 at 32/28/24px for section headers.
  - Title: Inter 600 at 24/20/18px for card headings.
  - Body: Inter 400 at 18px (desktop) / 16px (tablet & mobile) with 1.7 line-height.
  - Caption & labels: Inter 500 at 14px, uppercase variant 12px for badges.
- **Spacing scale:** 8px base unit. Container padding 48px desktop, 32px laptop, 24px tablet, 16px mobile. Vertical rhythm ensures 64px between major homepage sections.
- **Border radius:** Cards 16px, buttons 12px, inputs 10px, badges 999px.
- **Elevation levels:**
  - Base cards: `0 24px 60px rgba(15, 23, 42, 0.22)`.
  - Hover state: increases to `0 32px 80px rgba(15, 23, 42, 0.28)` with subtle scale.
  - Sticky header shadow: `0 10px 30px rgba(2, 6, 23, 0.5)`.

## Colour Palette
| Token | Hex | Usage |
| --- | --- | --- |
| `web.bg.canvas` | #0B1120 | Primary background gradient start. |
| `web.bg.canvasAlt` | #111827 | Secondary background and footer. |
| `web.bg.surface` | rgba(15, 23, 42, 0.7) | Frosted panels over hero imagery. |
| `web.text.primary` | #F8FAFC | Primary typography on dark backgrounds. |
| `web.text.secondary` | #CBD5F5 | Supporting copy, metadata. |
| `web.accent.primary` | #2563EB | Primary CTAs, link hover, hero gradients. |
| `web.accent.secondary` | #7C3AED | Secondary CTAs, highlight elements. |
| `web.accent.tertiary` | #14B8A6 | Accent for statistics and micro-interactions. |
| `web.feedback.success` | #22C55E | Success banners, form confirmations. |
| `web.feedback.warning` | #F59E0B | Alert banners, trial expiry warnings. |
| `web.feedback.error` | #F87171 | Error states, validation copy. |
| `web.border.default` | rgba(148, 163, 184, 0.2) | Card outlines, divider lines. |
| `web.gradient.hero` | linear-gradient(135deg, #2563EB 0%, #7C3AED 50%, #14B8A6 100%) | Hero overlay, CTA backgrounds. |

## Component Styling
- **Navigation bar:** Transparent gradient overlay atop hero (rgba(11,17,32,0.6)). On scroll, background solidifies to `#0B1120` with blur effect. Active menu item underlined with 3px `web.accent.primary` bar.
- **Hero CTA buttons:** Primary button uses gradient `#2563EB → #7C3AED`, 16px padding, soft glow shadow. Secondary button uses outlined style with `web.accent.secondary` border and transparent fill.
- **Cards:** Frosted glass effect using `backdrop-filter: blur(20px)` and semi-transparent backgrounds. Include top iconography with accent gradient circle. On hover, card lifts 4px and accent border animates in.
- **Testimonials carousel:** Cards with 20px radius, quote icon watermark, star rating tinted `#FBBF24`. Carousel arrows styled as circular ghost buttons.
- **Plan comparison table:** Sticky recommended column highlighted with subtle gradient background (#1E293B → #2563EB at 4% opacity). Checkmarks use `web.accent.secondary` and animate on hover.
- **Forms:** Inputs have dark background (#111827) with 1px `web.border.default` border. Focus state uses 2px `#2563EB` outline and drop shadow. Error state shifts border to `web.feedback.error` and displays helper text.
- **Modals:** 24px radius, drop shadow `0 40px 90px rgba(2, 6, 23, 0.55)`, blurred backdrop. Header includes icon + title, with close button 40px.
- **Tables & Data:** Header row uses uppercase labels, background `rgba(37, 99, 235, 0.12)`. Row hover uses `rgba(37, 99, 235, 0.08)`.
- **Badges:** Outline variant for tiers with `web.accent.secondary` border; filled variant for statuses using `web.accent.primary` background and white text.

## Imagery & Media
- Hero background uses abstract gradient illustration; overlay ensures readability. Video thumbnails include play button with `web.accent.primary` fill and subtle shadow.
- Resource cards feature 3:2 aspect ratio images with 12px radius. On hover, overlay gradient reveals “Read” CTA.

## Motion & Interaction
- **Parallax hero:** Subtle parallax effect on hero illustration; disabled if reduced motion preference detected.
- **Scroll-triggered reveals:** Sections fade-up with 240ms delay per element. Animations respect reduced motion by switching to static display.
- **Button hover:** 120ms ease-out translation upward by 2px; on focus, pulse glow added.
- **Mega menu:** Slides down with 200ms ease and dropshadow; closes when focus leaves component.

## Accessibility & Responsiveness
- All interactive elements maintain 44px height. Focus rings 2px `#38BDF8` with offset to remain visible on dark surfaces.
- Provide light theme variant with backgrounds flipping to #F8FAFC and text to #0F172A; accent colours unchanged.
- High-contrast toggle increases text weight (Inter 700 for headings) and removes background imagery for clarity.
- Layout breakpoints: ≥1440px (wide), 1280–1439px (desktop), 1024–1279px (laptop), 768–1023px (tablet), ≤767px (mobile). Grid reorganises to single column on mobile with stacked sections.
- Footer reorganises from four columns to accordion list on mobile for easier navigation.

## Performance Considerations
- Hero video lazy loads after DOMContentLoaded with poster fallback to maintain LCP under 2.5s.
- Background gradients implemented via CSS rather than images to reduce asset weight.
- Use modern image formats (WebP/AVIF) with responsive `srcset` for cards and testimonials.
- **CSS architecture:** Utilises layered approach with base tokens, component styles, and utility overrides. BEM naming maintained for marketing components; hashed classnames for React modules documented for consistency.
- **Print styles:** Dedicated stylesheet ensuring resource articles print with simplified layout, dark background removed, and essential elements retained.

## Form Styling & Validation
- **Input fields:** Semi-transparent backgrounds with 10px radius, focus glow `0 0 0 2px rgba(37, 99, 235, 0.4)`. Disabled state reduces opacity to 0.4 and removes drop shadow.
- **Select & dropdowns:** Use custom container with caret icon, 12px padding, and 1px border. Options list features 8px spacing and highlight bar on hover.
- **Multi-step forms:** Progress indicator styled as segmented bar with active segment accent-coloured; step titles displayed inline with responsive stack on mobile.
- **Validation messaging:** Inline helper text 14px `#F87171`; summary banner uses icon, bold first sentence, and anchor links.

## Data & Content Modules
- **Pricing table:** Use CSS grid with sticky recommended column, border separators, and alternating row backgrounds (#111827 / rgba(37, 99, 235, 0.08)).
- **Blog cards:** Include gradient overlay for readability, text lockup with uppercase category label, and subtle tilt animation on hover.
- **Timeline & stats blocks:** Vertical connectors styled with 2px accent line; stat blocks have 12px radius and gradient accent border.

## Media & Illustration Treatments
- **Video lightboxes:** Dimmed overlay (#020617 90%) with blur and drop shadow `0 40px 90px rgba(2, 6, 23, 0.65)`. Close button ghost style with accent hover.
- **Illustrations:** Encourage duotone treatment using brand palette; 24px padding and max-width 480px on desktop to maintain balance.
- **Icon buttons:** Circular 44px with 1px border, accent hover fill; used for carousel controls and social sharing.

## Accessibility & Alternate Themes
- **High-contrast theme:** Simplifies backgrounds to solid #000/#FFF combinations, increases font weight, and removes decorative imagery.
- **Reduced motion mode:** Disables parallax and scroll animations; retains fade transitions only.
- **RTL support:** Documentation specifies mirrored layout adjustments, including navigation order, arrow icons, and alignment for key components.
