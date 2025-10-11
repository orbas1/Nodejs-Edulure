# Settings Experience Specification – Web Application v1.00

## Information Architecture
- Primary tabs: Overview, Account, Notifications, Security, Billing, Integrations.
- Secondary navigation within each tab accessible via sticky sub-tabs (scrolls horizontally on mobile).

## Layout
- Overview: 2-column grid (8/4 split). Account and Billing use 2-column forms. Notifications uses matrix layout (table) with toggles.
- Sticky summary column (right) displays account status, plan, and quick help.

## Components
- Toggle matrix for notification preferences (channels vs events) using table with checkboxes.
- Billing card: shows current plan, next invoice, update payment method button.
- Security: 2FA setup card, device list table, login history timeline.

## Visual Styling
- Use accent backgrounds for warning states (e.g., "Complete your profile").
- Provide icons for each tab to reinforce recognition.
- Apply consistent spacing (24px between sections, 32px top/bottom).

## Interactions
- Auto-save toggles with inline spinner. Provide toast on success.
- Sensitive actions open confirmation modal requiring password or WebAuthn.
- Provide change logs in Security tab for audit.

## Accessibility
- Forms follow guidelines in `Forms.md`.
- Provide skip links within tab content for quick navigation to main sections.
- Ensure tables are responsive with overflow handling.

## Detailed Screen Layout (SCR-09)
- **Overview Tab:** Top metrics cards (Plan tier, Seats used, Security status) 3-column grid; below, quick links to billing, integrations, support.
- **Account Tab:** Two-column form (Personal info, Contact preferences). Avatar upload uses drop zone 160×160px.
- **Notifications Tab:** Matrix table with sticky headers, filter chips for event types.
- **Security Tab:** Device list table with location/IP, button group for revoke & trust device actions.
- **Billing Tab:** Invoices table (columns: Invoice #, Date, Amount, Status, Action) with download buttons.
- **Integrations Tab:** Cards representing available integrations with toggle for enable, `Configure` button to open modal.

## Interaction Specifics
- Tabs maintain scroll position; using `IntersectionObserver` to update active tab when user scrolls to section.
- Save confirmation appears as toast bottom-left; includes link to view change history.
- Sensitive forms require re-auth overlay (modal) with password + WebAuthn options.

## Responsive Behaviour
- On mobile, tabs convert to horizontal scroll pill nav pinned top. Summary column moves below forms with collapsible sections.
- Tables become stacked card layout with key-value pairs.

## Data Dependencies
- Settings API `GET /api/settings` returns nested object for account, notifications, security, billing.
- Integrations fetch `GET /api/integrations` with statuses (connected, pending, disconnected).

## Accessibility Additions
- Provide `aria-describedby` for toggles referencing helper text.
- Security timeline uses `<ol>` with `aria-live` updates when new login detected.
