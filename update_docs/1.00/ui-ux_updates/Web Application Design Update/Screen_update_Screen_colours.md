# Screen Colour Application – Version 1.00

| Screen | Primary Surfaces | Accent Usage | Gradients & Effects | Accessibility Notes |
| --- | --- | --- | --- | --- |
| SCR-00 Home | Background `#0B1120`, hero copy panel `rgba(15,23,42,0.72)` | Primary CTA gradient (`#4C7DFF → #A78BFA`), secondary link `#38BDF8` | Hero orbit overlay `radial-gradient(circle at 20% 30%, rgba(76,125,255,0.48), transparent)` layered with subtle noise | Ensure hero text `#F8FAFC` over gradient hits 11.4:1; testimonials use semi-transparent cards with 0.88 opacity |
| SCR-01 Onboarding | Surface `#111C3B`, form cards `#111C3B` with border `rgba(148,163,184,0.24)` | Step indicator active `#4C7DFF`, completed `#34D399`, upcoming `#2E3A59` | Progress track uses linear gradient `#4C7DFF → #38BDF8` for motion fill | Maintain 3:1 ratio on disabled states by using `rgba(148,163,184,0.56)` text |
| SCR-02 Dashboard | Base `#0B1120`, cards `#111C3B`, task rail `#111C3B` | KPI deltas green `#34D399` / red `#F87171`, filter chips `#4C7DFF` border | Background grid overlay `linear-gradient(90deg, rgba(76,125,255,0.04) 0, transparent 50%)` repeating | Ensure chart lines use accessible combinations (e.g., `#38BDF8` vs `#F59E0B`) and provide 2px stroke |
| SCR-03 Learn Library | Surface `#0B1120`, search bar `rgba(15,23,42,0.68)` | Active filter chip fill `rgba(76,125,255,0.2)` with border `#4C7DFF` | Course card top border gradient `linear-gradient(90deg, #4C7DFF, #A78BFA)` 2px thick | Provide 4.5:1 contrast on metadata by using `#CBD5F5` |
| SCR-04 Course Detail | Hero background `linear-gradient(135deg, #0B1120, #111C3B)` | CTA button gradient `#4C7DFF → #7C5DDB`, rating stars `#F59E0B` | Stats pill uses glassmorphism `rgba(148,163,184,0.16)` with blur 20px | Reviews highlight `#1E293B` to separate alternating rows |
| SCR-05 Lesson Player | Player chrome `#0B1120`, transcript pane `#111C3B` | Active transcript line `#38BDF8` underline, note tags `#A78BFA` | Background glow behind player `radial-gradient(circle, rgba(76,125,255,0.24), rgba(11,17,32,0) 70%)` | Captions default `#F8FAFC` on overlay `rgba(0,0,0,0.56)` |
| SCR-06 Communities | Feed background `#0B1120`, cards `#111C3B` | Topic tabs highlight `#4C7DFF`, reaction badges `#A78BFA` | Event calendar header gradient `linear-gradient(118deg, #4C7DFF, #38BDF8)` | Ensure reaction icons maintain 3:1 by using tinted background pills |
| SCR-07 Community Detail | Hero banner overlay `rgba(11,17,32,0.4)` over uploaded image | Admin controls `#F59E0B` accent, stats `#34D399` | Scroll progress indicator `linear-gradient(180deg, rgba(56,189,248,0.4), transparent)` | Member roles use badges with contrast-coded backgrounds (Moderator `#A78BFA`, Admin `#F59E0B`) |
| SCR-08 Profile | Cover gradient `linear-gradient(135deg, #4C7DFF, #A78BFA)` with mask | Badge backgrounds `rgba(167,139,250,0.16)`, heatmap gradient `#34D399 → #F59E0B` | Timeline connectors use `rgba(148,163,184,0.32)` lines | Provide tooltip backgrounds `#111C3B` with white text for clarity |
| SCR-09 Settings | Tabs background `#0B1120`, active tab `rgba(56,189,248,0.16)` with indicator `#38BDF8` | Warning banners `#F59E0B` gradient, success `#34D399` | Forms use neutral background `rgba(15,23,42,0.68)` with focus glow `#38BDF8` | Ensure error text `#F87171` meets 4.5:1 on form backgrounds |
| SCR-10 Support | FAQ cards `#111C3B`, contact cards gradient `#38BDF8 → #4C7DFF` | Ticket status badges: Open `#38BDF8`, Pending `#F59E0B`, Resolved `#34D399`, Escalated `#F87171` | Background uses subtle diagonal pattern `url(assets/patterns/support-grid.svg)` at 6% opacity | Provide high contrast for case IDs (`#F8FAFC` on dark badges) |
| SCR-11 Admin Analytics | Dashboard background `#0B1120`, analytics cards `#111C3B` | Chart palettes: Series1 `#4C7DFF`, Series2 `#34D399`, Series3 `#F59E0B`, Series4 `#A78BFA` | Heatmap overlay `rgba(76,125,255,0.18)` for selected rows | Export CTA uses accent `#38BDF8` with hover lighten |
| SCR-12 Admin Content | Table rows `#0B1120`, header `#111C3B` | Status chips: Draft `#A78BFA`, Published `#34D399`, Scheduled `#38BDF8`, Archived `#94A3B8` | Bulk toolbar drop shadow `0 12px 32px rgba(11,17,32,0.36)` | Row hover uses overlay `rgba(56,189,248,0.08)` to maintain contrast |

## Global Tokens
- Primary text `#F8FAFC`, secondary `#CBD5F5`, disabled `rgba(148,163,184,0.48)`.
- Focus ring colour `#38BDF8`, 2px thickness with 4px offset.
- Shadows standardised via `--shadow-elevated` token to ensure consistent depth.

## Theme Variants
- Light mode flips surfaces to near-white variants defined in `colours.md` while preserving accent hues; ensure chart palette darkens by 20% for readability.
- High-contrast mode increases border opacity to 0.48 and darkens backgrounds to `#050816`.
