# Package & Pricing Design – Web Application v1.00

## Layout
- Three-column pricing grid (Starter, Growth, Enterprise) with cards 360px width, 32px gap.
- Enterprise plan highlights with glow border `0 0 0 2px rgba(76,125,255,0.48)` and top badge "Most Popular".
- CTA row with annual/monthly toggle (switch) centred above cards.

## Card Structure
- Header: Plan name (24px), price (Clash Display 48px), billing cycle text (16px secondary).
- Feature list: 6 bullet items using check icons (20px) tinted `#34D399`.
- CTA button (Primary for highlighted plan, Secondary for others).
- Tooltip icon near price explaining billing logic.

## Add-ons Section
- Accordion below pricing grid listing optional add-ons (Coaching, Enterprise Support, API Access).
- Each add-on row 72px height with description and toggle to add to plan.

## Comparison Table
- Responsive table with sticky header. Columns: Feature, Starter, Growth, Enterprise.
- Use check icons or "Included/Optional" tags. Row height 56px.

## Visual Styling
- Background gradient `linear-gradient(135deg, rgba(76,125,255,0.12), rgba(15,23,42,0.92))`.
- Cards have 24px padding, 20px radius, drop shadow `0 24px 48px rgba(11,17,32,0.48)`.
- Price emphasised with glow effect: text shadow `0 12px 32px rgba(76,125,255,0.32)`.

## Interaction
- Toggle switches animate 160ms, update prices via state change.
- Hover on card scales 1.02 and lifts shadow.
- Enterprise plan CTA opens contact modal with form fields (Name, Company, Email, Message, Budget).

## Data Requirements
- Price values stored in config: Starter $19, Growth $49, Enterprise custom.
- Feature list arrays for dynamic rendering to ensure localisation.

## Accessibility
- Provide `aria-describedby` linking to disclaimers.
- Maintain contrast ratio >4.5:1 for text on gradient backgrounds.
- Toggle accessible via keyboard and labelled for screen readers.
