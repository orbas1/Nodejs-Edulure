# Button Specifications by Screen – Version 1.00

## Button Tokens
- **Primary (BTN-PRM):** Gradient `linear-gradient(118deg, #4C7DFF, #7C5DDB 52%, #A78BFA)`, text `#F8FAFC`, height 56px, radius 14px, padding `0 28px`.
- **Secondary (BTN-SEC):** Outline `1px solid rgba(148,163,184,0.4)`, background `rgba(15,23,42,0.6)`, height 52px, radius 14px, padding `0 24px`.
- **Tertiary (BTN-TER):** Text-only `#38BDF8`, underline on hover, 20px icon spacing.
- **Destructive (BTN-DSC):** Fill `#F87171`, text `#0B1120`, focus ring `#F59E0B` 2px.
- **Icon Button (BTN-ICO):** Circular 48px, background `rgba(15,23,42,0.68)`, icon 24px.

## Screen-specific Usage

### SCR-00 Home
- **Primary CTA:** BTN-PRM label "Start your personalised plan". Width auto, max 320px. Hover lighten gradient 12%.
- **Secondary CTA:** BTN-TER "Explore courses" with arrow icon 20px from text.
- **Newsletter Submit:** BTN-SEC text "Subscribe" height 48px.

### SCR-01 Onboarding
- **Stepper Next:** BTN-PRM width 200px, align right. Disabled state reduces opacity to 0.4 and disables pointer events.
- **Back:** BTN-TER left-aligned icon `chevron-left` 20px.
- **Skip (optional):** BTN-TER grey text `#94A3B8` becomes active `#CBD5F5` on hover.
- **Finish:** BTN-PRM full width 240px with check icon.

### SCR-02 Dashboard
- **Filter Reset:** BTN-TER minimal.
- **Quick Action Buttons:** BTN-SEC for "Create course", "Invite mentor"; height 48px.
- **Task Actions:** Inline BTN-TER `Mark done`, `Snooze` using 14px text, 12px padding.

### SCR-03 Learn Library
- **Search Submit:** Icon BTN-ICO with search icon.
- **Card CTA:** BTN-SEC "View details" inside card (width 100%), tertiary "Preview" link.
- **Saved Toggle:** Icon button 40px with bookmark icon; filled variant `#4C7DFF` on active.

### SCR-04 Course Detail
- **Hero CTA:** BTN-PRM width 260px, includes `play` icon (24px). Provide pressed state translation Y=2px.
- **Secondary CTA:** BTN-SEC "Share" with `share` icon; `Copy link` uses BTN-TER.
- **Syllabus Action:** Each lesson uses BTN-TER "Start" with arrow.

### SCR-05 Lesson Player
- **Primary Controls:** Play/pause icon buttons (BTN-ICO 64px). Speed dropdown uses BTN-SEC pill 44px height.
- **Notes Save:** BTN-SEC "Save note" disabled until changes detected.
- **Resource Download:** BTN-SEC with download icon, width 200px.

### SCR-06 Communities Hub
- **Composer Submit:** BTN-PRM "Post" width 120px, disabled state 0.5 opacity.
- **Event RSVP:** BTN-PRM "Save your spot" width 200px. Secondary `Add to calendar` BTN-TER.
- **Follow Toggle:** BTN-SEC 160px toggled filled `#4C7DFF` with text `Following` when active.

### SCR-07 Community Detail
- **Post Update:** BTN-PRM 200px. Admin "Invite members" BTN-SEC with plus icon.
- **Pinned Resource CTA:** BTN-TER "Open".
- **Members Actions:** Icon buttons 36px for message, more actions.

### SCR-08 Profile
- **Edit Profile:** BTN-SEC with pencil icon.
- **Share Profile:** BTN-TER with link icon.
- **Badge Filter Buttons:** Segmented control using BTN-SEC active fill `rgba(76,125,255,0.24)`.

### SCR-09 Settings
- **Save (when needed):** BTN-PRM anchored bottom-right of form (sticky) width 180px.
- **Add Payment Method:** BTN-SEC 220px with credit-card icon.
- **Danger Zone:** BTN-DSC "Deactivate account" width 240px.

### SCR-10 Support
- **Contact Buttons:** BTN-PRM "Chat with support" width 240px, BTN-SEC "Email us" width 220px.
- **Ticket Submit:** BTN-PRM full width 240px.
- **FAQ Expand:** Icon button 32px rotates chevron.

### SCR-11 Admin Analytics
- **Export CSV:** BTN-SEC with download icon 200px.
- **Add Widget:** BTN-PRM small variant height 48px.
- **Filter Apply:** BTN-PRM 160px; `Reset` BTN-TER.

### SCR-12 Admin Content
- **Create Course:** BTN-PRM 220px.
- **Bulk Toolbar Actions:** BTN-SEC for `Publish`, BTN-SEC for `Assign owner`; destructive `Archive` uses BTN-DSC.
- **Row More Menu:** Icon button 32px.

## Interaction States
- Hover: lighten gradient or increase border opacity + drop shadow `0 16px 32px rgba(11,17,32,0.32)`.
- Focus: 2px outline `#38BDF8` with 4px offset.
- Active: translateY(1px), reduce shadow.
- Loading: show spinner 20px inside button with `aria-live="polite"` text update.

## Accessibility Guidelines
- Minimum touch target 44×44px even if visual smaller (use padding).
- Provide `aria-pressed` for toggle buttons (follow, bookmark).
- Ensure button labels unique within context for screen readers.
