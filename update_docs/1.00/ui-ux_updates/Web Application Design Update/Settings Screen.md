# Settings Screen Blueprint – SCR-09

## Viewport Layout
- **Desktop (≥1280px):**
  - Sticky tab bar at top (height 64px) with pill indicator.
  - Content grid with 8-column form area (columns 1–8) and 4-column summary rail (columns 9–12).
  - Summary rail contains plan card (180px height), support card (160px), security status (140px).
- **Tablet (768–1279px):**
  - Tabs convert to horizontally scrollable segment control.
  - Summary rail collapses into accordion sections placed below forms.
- **Mobile (<768px):**
  - Single column layout, tabs convert to dropdown select (height 48px) pinned under header.
  - Sections stack with 24px spacing; forms use full width 16px padding.

## Section Breakdown
1. **Overview**
   - Metrics row (Plan, Seats used, MFA status) using mini cards 200×120px.
   - Quick actions row with icons (Manage billing, Manage integrations, View invoices).
2. **Account**
   - Personal info card: Name, Title, Email, Phone (two-column on desktop).
   - Organisation info card: Company, Industry, Timezone, Locale.
   - Avatar uploader: 160×160px circle with overlay camera icon; supports drag drop.
3. **Notifications**
   - Channel toggles row (Email, Push, SMS, In-app) using segmented controls.
   - Preference matrix table 960px width; sticky header row height 56px, cell padding 16px.
   - Digest frequency dropdown (Daily, Weekly, Monthly) with inline helper copy.
4. **Security**
   - MFA setup card with CTA `Enable now` (BTN-PRM) and status text.
   - Device list table (columns: Device, Location/IP, Last seen, Actions) 100% width, 64px row height.
   - Login history timeline (vertical list) with badges for suspicious activity.
5. **Billing**
   - Current plan card showing price, renewal date, `Upgrade plan` button.
   - Payment methods card with list of saved cards (64px rows) and `Add payment method` button.
   - Invoice table (columns: Invoice #, Date, Amount, Status, Download).
6. **Integrations**
   - Integration cards grid (3 columns) with provider logo 48px, description, toggle, configure button.
   - Connected integrations appear first; disconnected greyed but accessible.

## Interaction & Motion
- Tabs animate indicator using 200ms cubic-bezier(0.33,1,0.68,1).
- Form field focus transitions 120ms from neutral to focus ring.
- Summary rail cards fade in on scroll with 80ms stagger.
- Toast notifications slide from bottom-left 160ms.

## Accessibility
- Ensure tablist uses `role="tablist"` with `aria-controls` linking to sections.
- Summary rail cards labelled with `aria-labelledby` referencing heading text.
- Provide skip link "Skip to settings content" before tabs.
- All tables include caption summarising contents.

## Data & Dependencies
- Pulls `GET /api/settings` on mount; splits into context-specific stores (accountStore, notificationStore).
- Save actions: account `PUT /api/settings/account`, notifications `PATCH /api/settings/preferences`, security `POST /api/settings/security`.
- Billing integrates with Stripe billing portal; clicking `Manage billing` opens new tab with `redirect_url` from API.

## Edge Cases
- When user lacks billing permission, show locked state card with tooltip.
- If MFA enforced by org, display blocking modal requiring setup before leaving screen.
- When offline, display top banner and disable form submissions (buttons show offline label).
