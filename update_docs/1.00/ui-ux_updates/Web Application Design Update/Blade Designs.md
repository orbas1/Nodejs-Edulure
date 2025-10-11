# Blade Template Design Notes – Web Application v1.00

> Applicable to Laravel Blade views powering marketing pages prior to React shell handoff.

## Layout Structure
- Use master layout `layouts/app.blade.php` with sections: `head`, `body`, `scripts`.
- Include `@yield('hero')`, `@yield('content')`, `@yield('cta')` to support modular sections described in `Home Page Organisations.md`.

## Components
- Hero component `components.hero` accepts props: `eyebrow`, `headline`, `copy`, `primaryCta`, `secondaryCta`, `illustration`.
- Card components defined as `components.card` with slots for icon, title, body, actions.
- Carousel component `components.carousel` uses Alpine.js for slide state; ensures ARIA roles.
- Commerce partial `components.checkout-summary` renders order line items, coupon row, tax breakdown, and total summary. Accepts props for `items`, `taxes`, `discounts`, `totals`, and `ctaLabel`; ensures numeric values formatted via shared helper mirroring backend currency rules.
- Payment method partials:
  - `components.payment-method-card` loops saved cards, surfaces masked digits, brand icon, and SCA status badge. Emits `select` event consumed by Alpine.
  - `components.payment-method-paypal` renders PayPal approval CTA and fallback instructions; includes hidden input storing backend order ID for webhook reconciliation.
  - `components.payment-method-bank` provides open banking/wallet options with provider logos and availability copy.
- Finance admin partial `components.refund-form` exposes amount selector (slider + manual input), reason dropdown, and attachment uploader with validation states tied to policy copy.
- Webhook monitor partial `components.webhook-feed` prints timeline items with severity colour tokens and exposes filters for `status`, `provider`, and `eventType` using Alpine state machine.

## Styling Integration
- Link compiled CSS from design system build (`/css/web-v1.css`).
- Use Blade directives to inject theme data attributes (`data-theme="dark"`).
- Add `@stack('styles')` for page-specific overrides.

## Responsive Layout
- Breakpoints follow `Screen Size Changes.md`; use utility classes to hide/show sections as needed.
- Ensure hero background uses inline style referencing gradient tokens.

## Data Binding
- Pass copy strings via translation files `resources/lang/en/home.php` to align with `Home page text.md`.
- Use config arrays for pricing packages to maintain consistency with `Package designs.md`.
- Checkout pages should pull dynamic data from payment intents endpoint. Use controller to inject `$intent`, `$coupon`, and `$financeSummary` arrays to avoid direct API calls inside templates. Include hidden CSRF field tied to `/api/payments/webhooks/stripe` signature validation guidance.

## Accessibility
- Use semantic HTML tags, `aria-labels` for navigation, `aria-expanded` on accordions.
- Ensure skip link is first focusable element in layout.
- Apply `aria-live="polite"` to checkout total containers so coupon/tax changes announced for assistive technologies. Add descriptive labels to refund amount sliders and ensure evidence upload dropzones include keyboard-triggerable buttons.

## Performance
- Defer non-critical scripts using `@push('scripts')` with `defer` attribute.
- Inline critical CSS for hero to avoid flash of unstyled content.

## Localization & Personalisation
- Use `@lang` directives for multi-language support.
- When user cookie indicates provider/enterprise, load corresponding partials (`@include('home.provider')`).
- Surface locale-aware currency formatting by passing `app()->getLocale()` into checkout components and deferring to shared currency helper to mirror backend rounding. Provide translation keys for payment error codes and PayPal fallback messaging so marketing/compliance can customise per region.
