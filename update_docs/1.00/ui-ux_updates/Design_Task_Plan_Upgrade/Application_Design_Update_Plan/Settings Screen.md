# Settings Screen — Detailed Layout Spec

## Screen Overview
- **Route ID:** `app/settings`
- **Entry Points:** Profile tab, overflow menu (provider), onboarding reminder toast.
- **Primary Goal:** Allow users to adjust personal, notification, and accessibility settings within 3 taps.

## Layout Breakdown (Portrait Phone)
1. **Top App Bar (Height 88 dp):** Title “Settings”, left back arrow, right help icon (opens help centre article in modal).
2. **Profile Capsule (Height 132 dp):**
   - Avatar 104 dp centre-left, editable camera badge (24 dp) anchored bottom-right.
   - Display name `title/01`, role chip (Learner/Provider) using `accent/500`.
   - Quick action buttons (Edit Profile, View Public) 44 dp height, pill style.
3. **Section Accordions:**
   - Each accordion header 64 dp height with icon (32 dp) and summary text.
   - Expanded content uses card with 16 dp padding, 12 dp spacing between controls.
4. **Support Block:** Inline card with illustration (80 dp square) referencing `support_chat.svg` and CTA “Chat with Support”.
5. **Legal Links:** Inline list with caret icons; open in in-app browser sheet (height 88% of viewport).
6. **Destructive Actions:** `Delete Account`, `Deactivate Provider`. Buttons 48 dp height, background `error/500`, text white, require long-press (1.2 s) to activate.

## Tablet Adaptation
- Split view: left nav rail (width 240 dp) lists sections, right panel displays selected content. Keep sticky header at top with breadcrumbs.

## Motion & Feedback
- Accordions animate 200 ms ease-out with height auto transitions.
- Save confirmations: success toast slides from bottom, 64 dp height, icon + message.
- Error state: inline message with red border, vibrate once (heavy impact) on iOS.

## Accessibility & Internationalisation
- Focus order: App bar → Profile actions → Section headers (top to bottom) → Support → Legal → Destructive.
- Provide localised strings with fallback to English. Ensure layout accommodates longer German strings (increase accordion header to 2 lines if needed).
- Screen supports Voice Control commands like “Open Accessibility Settings”.

## Analytics & Telemetry
- Track events `settings_section_open`, `settings_toggle_changed`, `settings_support_cta_click`.
- Attach metadata `sectionId`, `sourceScreen`, `deviceType`.

## QA Checklist
- Validate each toggle persists after app restart.
- Confirm focus outline visible in both light/dark themes.
- Check that offline mode disables integration management with explanatory banner (info/500 background, 16 dp padding).
