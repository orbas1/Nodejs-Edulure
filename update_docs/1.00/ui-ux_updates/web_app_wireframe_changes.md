# Version 1.00 Web Application Wireframe Changes

## Global Shell & Navigation
- **Header layout:** Left-aligned Edulure wordmark, centre-aligned universal search with auto-suggest, right-aligned quick actions (Notifications, Help, Profile menu, “Start free trial”). Search expands to full width on focus, pushing navigation links into mega menu.
- **Primary navigation:** Horizontal menu with sections (Why Edulure, Solutions, Resources, Pricing, Sign In). Hover reveals mega menu with featured stories, quick links, and CTA.
- **Sticky behaviour:** Header compresses to 56px on scroll with simplified navigation to preserve vertical space. Back-to-top button appears at 50% scroll.
- **Responsive adaptation:** At <=1024px, navigation collapses into hamburger overlay with accordion sections for Solutions and Resources. Search becomes icon that opens full-screen overlay.
- **Persistent footer:** Multi-column footer with sitemap, legal, social links, and newsletter signup.

## Homepage & Landing Flow
- **Hero section:** Two-column grid featuring headline, supportive copy, primary CTA (“Explore courses”) and secondary CTA (“Talk to sales”). Right column hosts autoplay-muted video demonstrating platform; fallback hero image on mobile.
- **Trust signals:** Row of partner logos with grayscale styling and tooltip describing success metrics.
- **Value pillars:** Three cards (“Learn”, “Teach”, “Grow Communities”) with iconography, short description, and deep-link buttons.
- **Dynamic product tour:** Interactive tabs demonstrating learner, provider, community views. Each tab reveals annotated screenshot with bullet list of benefits.
- **Testimonials carousel:** Horizontal slider with avatar, quote, organisation, star rating.
- **Call-to-action band:** Gradient section with newsletter form, anchored before footer.

## Pricing & Conversion Pages
- **Plan comparison table:** Sticky column containing recommended plan; features and limits displayed row-wise with checkmarks.
- **FAQ accordion:** Expandable sections with microcopy and support link.
- **Enterprise inquiry form:** Multi-step form with progress indicator, inline validation, and optional attachments.

## Resource Library & Blog
- **Filterable grid:** Cards representing articles, webinars, case studies with tag filters and search.
- **Detail page layout:** Hero image, metadata (author, reading time), share icons, table of contents sticky on desktop.
- **Related content strip:** Carousel of similar resources at bottom.

## Auth & Account
- **Sign in/up pages:** Split layout with benefits panel. Forms include social login buttons, remember me, forgot password. Accessibility hints below inputs.
- **Password reset:** Three-step flow (request, code verification, new password) with progress indicator and supportive copy.

## Application Handoff CTA
- **Persistent banner:** When logged in, top-of-page banner invites user to open learner or provider console with context-based CTA.
- **Inline demo launcher:** Floating “Launch Demo” button reveals modal with interactive walkthrough embedded (iframe or simulated screens).

## Information Architecture for In-App Web Console
- **Dashboard entry:** Upon login, providers redirected to console with left navigation (Dashboard, Content, Communities, Monetise, Analytics, Settings). Layout mirrors provider wireframes ensuring continuity.
- **Learner web app** shares same global shell but swaps navigation items for Home, Learn, Communities, Explorer, Profile. Profile menu includes theme toggle and account settings.

## Community Hub (Web Experience)
- **Hero + metrics:** Banner with tier chips, join/upgrade CTA, stats (members, live events, trending topics).
- **Tabbed canvas:** Feed, Events, Resources, Leaderboard, Chat. Each tab uses consistent right sidebar for quick links and moderators.
- **Events calendar:** Month view with list toggle; cards include RSVP state, host avatars, “Add to calendar” button.
- **Moderation tools:** Slide-out panel triggered via shield icon showing flagged content queue, member actions, audit log snippet.

## Explorer & Search
- **Layout:** Three-column grid (cards) above 1280px, two-column between 768–1280px, single column below 768px.
- **Filter column:** Left sidebar containing search refinement (topic tags, price slider, difficulty toggles, media type). Mobile uses bottom sheet filters.
- **Result card structure:** Thumbnail, title, rating, provider info, tags, CTA buttons (View, Save, Follow). Hover reveals quick preview popover.
- **Empty state:** Illustrations with copy guiding user to explore curated collections; includes “Reset filters” button.

## Support & Compliance Pages
- **Help centre:** Search bar, categories grid, featured articles. Article page includes breadcrumb, feedback widget, and related resources.
- **Status page integration:** Status badge in footer linking to uptime dashboard.
- **Legal documents:** Tabbed interface for Terms, Privacy, Cookie Policy with anchor-based navigation.

## Accessibility & Responsiveness Considerations
- All interactive elements maintain 44px minimum height and 12px spacing for click targets.
- Colour contrast meets WCAG 2.1 AA with default theme; high-contrast toggle added to footer.
- Keyboard focus order matches visual order; skip-to-content link appears on focus.
- Responsive typography scale (clamp) ensures comfortable reading width across breakpoints.

## Additional Landing & Campaign Pages
- **Webinars & events landing:** Hero with registration form, agenda timeline, speaker cards, and countdown timer. Includes sticky CTA and testimonial strip.
- **Partner programme page:** Two-column layout describing benefits, tier cards, and application form with required company info. FAQ accordion and success metrics grid support credibility.
- **Customer stories:** Masonry grid of case studies with filter chips (industry, size). Detail page features stats header, challenge/solution/outcome sections, and pull quotes.

## Checkout & Self-Serve Trial Flow
- **Free trial signup:** Modal overlay with short form (name, work email, organisation size) and consent checkboxes. Confirmation page outlines next steps and link to onboarding call scheduler.
- **Checkout summary:** Sidebar shows plan, seats, billing frequency, tax estimate, promo code field. Main content includes payment method selector, billing address, and terms acknowledgement.
- **Post-purchase screen:** Success state with onboarding checklist, invite teammates CTA, and download apps links.

## SEO & Content Infrastructure
- **Pillar pages:** Long-form layout with sticky secondary navigation, inline CTA banners, and related resources sections between content blocks.
- **Glossary:** Alphabetised list with quick index, search, and dynamic definition cards displayed via right panel.

## Error & System States
- **Maintenance mode:** Full-screen message with estimated downtime, status link, and contact support CTA.
- **404 & 500 pages:** Illustration, search input, and suggested links to return user to key areas. 500 page includes “report issue” button.

## Documentation of Embedded Apps
- **Interactive demo containers:** Wireframe includes frame dimensions, tab controls for different personas, and annotation callouts to describe functionality. Loading state documented with skeleton screen.
