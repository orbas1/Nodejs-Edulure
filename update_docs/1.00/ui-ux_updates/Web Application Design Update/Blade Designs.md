# Blade Template Design Notes – Web Application v1.00

> Applicable to Laravel Blade views powering marketing pages prior to React shell handoff.

## Layout Structure
- Use master layout `layouts/app.blade.php` with sections: `head`, `body`, `scripts`.
- Include `@yield('hero')`, `@yield('content')`, `@yield('cta')` to support modular sections described in `Home Page Organisations.md`.

## Components
- Hero component `components.hero` accepts props: `eyebrow`, `headline`, `copy`, `primaryCta`, `secondaryCta`, `illustration`.
- Card components defined as `components.card` with slots for icon, title, body, actions.
- Carousel component `components.carousel` uses Alpine.js for slide state; ensures ARIA roles.

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

## Accessibility
- Use semantic HTML tags, `aria-labels` for navigation, `aria-expanded` on accordions.
- Ensure skip link is first focusable element in layout.

## Performance
- Defer non-critical scripts using `@push('scripts')` with `defer` attribute.
- Inline critical CSS for hero to avoid flash of unstyled content.

## Localization & Personalisation
- Use `@lang` directives for multi-language support.
- When user cookie indicates provider/enterprise, load corresponding partials (`@include('home.provider')`).
