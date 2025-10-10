# Functional Design Specification – Web Application v1.00

## Overview
This document maps user interactions to system behaviours for the Version 1.00 web experience. Each function aligns with design modules described in related docs.

## Global Interactions
- **Navigation Segments**
  - Selecting "Prospective Learners", "Providers", or "Enterprises" triggers route change `/home?audience=` parameter, updates hero copy, and filters featured modules. Transition uses fade-in 240ms.
  - Quick Create button opens modal with context-specific options (course, event, announcement) derived from user role.
- **Search Overlay (`⌘/Ctrl + K`)**
  - Opens overlay with sections: Recent (max 5 items), Saved Searches, Global Entities. Input uses 200ms debounce hitting `/api/search?q=`.
  - Arrow keys navigate, Enter executes navigation. ESC closes and returns focus to trigger.

## Home Modules
- **Hero CTA**
  - Primary CTA leads to either onboarding or resume route depending on `user.progress`. Secondary link scrolls to modules section using smooth scroll 320ms.
- **Resume Carousel**
  - Horizontal scroll with snapping. Each card features progress data; clicking resumes course at last lesson. Uses GraphQL query `resumeModules`.
- **Community Highlights**
  - Fetches top 3 communities by engagement. Hover reveals join/share actions; join prompts confirm modal if tiered access.

## Dashboard Widgets
- **Performance Overview**
  - KPI cards refresh every 5 minutes. Clicking "View details" pushes to `/dashboard/performance` with applied filters.
- **Learner Funnel Chart**
  - Interactive chart with segments clickable; selecting stage filters table below via query param `?stage=`.
- **Task List**
  - Pulls assignments from `/api/tasks`. Dragging tasks reorders via PATCH request. Completed tasks animate fade-out 120ms and move to "Completed" tab.

## Profile Modules
- **Profile Header**
  - Cover image 1440×360 cropping tool. Edit button opens modal with preview; saving updates via S3 presigned upload.
- **Badges & Achievements**
  - Grid of 4 columns; each badge card includes tooltip with description loaded from `/api/badges/:id`.
- **Follower Interaction**
  - Follow button toggles state with optimistic UI update; on failure revert and show toast.

## Settings & Support
- **Settings Dashboard**
  - Tabbed interface: Account, Notifications, Security, Billing. Each tab loads content lazily.
  - Notification matrix uses toggle grid; saving triggers summary toast.
- **Support Drawer**
  - Accessible from help icon. Contains search field for knowledge base (Algolia index), contact options, and quick links.

## Error & Offline Handling
- Use skeleton loaders until data resolves. For offline detection, show banner with reconnect attempt every 30s.
- Form submission errors show inline message and log event `form_submission_error` with metadata.

## Analytics
- All primary actions emit event names defined in `Resources.md`. Example: `home_hero_cta_click`, `dashboard_filter_change`.
- Use Segment integration with user traits (role, plan, region).

## Security & Permissions
- Role-based content gating ensures provider-only widgets hidden for learners. Attempted access prompts upgrade modal.
- Sensitive actions (payout changes) require re-auth confirmation modal using WebAuthn when available.

## Dependencies
- Logic flows detailed in `Logic_Flow_update.md` and `Logic_Flow_map.md` align with these functions to ensure QA coverage.
