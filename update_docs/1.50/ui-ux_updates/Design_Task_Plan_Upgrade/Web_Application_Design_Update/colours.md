# Dark Theme Colour Mapping – Web Application v1.50

## Base Palette
- Background `#0F172A`
- Surface `#111C2D`
- Elevated Surface `#16213C`
- Border `#22314D`
- Text Primary `#F8FAFC`
- Text Secondary `#CBD5F5`

## Accent Tokens
- Primary Gradient `#4338CA → #6366F1`
- Secondary Accent `#F97316`
- Success `#22C55E`
- Warning `#FBBF24`
- Error `#F87171`
- Info `#38BDF8`

## Usage Guidelines
- Buttons: use solid colors with lighter hover states (increase brightness 8%).
- Cards: apply subtle border (#1F2A44) and drop shadow (0 10px 24px rgba(15, 23, 42, 0.6)).
- Tables: alternating row backgrounds (#111C2D / #16213C) for readability.

## Accessibility
- Ensure text on accent backgrounds maintains 4.5:1 contrast (use white text or lighten background as needed).
- Provide high contrast variant: background #000A16, text #FFFFFF, accent #7C3AED.

## Implementation
- Define CSS variables under `[data-theme="dark"]` and `[data-theme="high-contrast"]`.
- Update charts to use lighter gridlines (#1F2937) and ensure colorblind-friendly palette.
