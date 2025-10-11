# Version 1.00 Learner App Wireframe Changes

## Global Structure
- **Navigation shell:** Mobile app uses bottom navigation (Home, Learn, Communities, Explorer, Profile). Tablet/web variants adopt side navigation with collapsible labels.
- **Header utilities:** Search omnibox, notification bell, profile avatar anchored top-right. Voice search and filter shortcuts displayed inline on mobile home.
- **Responsive layout:** 12-column grid on web, 4-column modular sections on mobile. Key cards adopt 16px padding and 12px spacing.

## Home & Activity Feed
- **Welcome hero:** Personalised greeting banner with daily goal progress ring and CTA to resume primary course. Secondary actions include “View streak” and “Adjust goal”.
- **Stacked sections:**
  - **Continue Learning:** Horizontal carousel of in-progress courses/ebooks showing progress, estimated time, and resume button.
  - **Community Highlights:** Card stack with community posts, pinned announcements, and event teasers; includes join/pay badge.
  - **Recommended For You:** Two-column grid (web) / vertical list (mobile) of recommended modules with tags and difficulty badges.
  - **Upcoming Events:** Timeline card listing events with RSVP buttons and join countdown.
- **Quick filters:** Chips across top (“Courses”, “Communities”, “Events”, “Saved”) toggle feed composition. Active chip underlined.

## Course Player
- **Lesson overview drawer:** Slide-in panel from left showing module tree, lesson status icons, and downloadable resources button.
- **Content canvas:** Central player supports slides, video, or combined media with consistent controls (playback speed, captions, fullscreen). Transcript toggles from right panel.
- **Interaction footer:** Houses note-taking button, question submission, reaction emoji, and next/previous navigation.
- **Progress tracker:** Sticky top bar indicates lesson progress, time remaining, and offline availability toggle.

## Slide & Ebook Experience
- **Slide viewer:** Full-bleed canvas with left/right tap zones, top breadcrumb (Course → Module → Lesson), and bottom nav showing slide thumbnails.
- **Ebook reader:** Scroll or page-turn modes accessible via toggle. Typography controls accessible from floating FAB (font size, dyslexia font, line height, themes). Bookmark and highlight icons persist in top toolbar.
- **Annotation drawer:** Expands from bottom to show highlights, notes, and quick share options. Sync status indicator confirms cloud backup.

## Assessments & Gamification
- **Inline quizzes:** Cards inserted between content with progress dots, immediate feedback states, and explanation drawer.
- **Challenge ladder:** Community-specific leaderboard accessible via tab; includes progress bar, rewards, and share CTA.
- **Achievements modal:** Triggered upon milestone completion; displays badge art, description, and link to share on social.

## Communities Hub
- **Community list:** Left column (web) or top dropdown (mobile) listing joined communities with unread counters and tier badges.
- **Community hero:** Cover image, tier marker, member count, join/upgrade CTA. Sub-actions: “Invite friend”, “Message mentor”.
- **Tab sections:** Feed, Challenges, Events, Resources, Chat.
  - **Feed:** Mixed media posts, polls, assignments with reaction bar and comment preview.
  - **Challenges:** Card deck showing active challenges, required actions, progress, reward summary.
  - **Events:** Calendar list with RSVP state, add to calendar button, and countdown chip.
  - **Resources:** Filterable list of pinned files, templates, recordings.
  - **Chat:** Channel list + DM panel with composer.

## Explorer & Discovery
- **Search hero:** Sticky search input with filters icon. Suggestion chips display trending topics.
- **Result tabs:** Courses, Communities, People, Assets. Each tab uses consistent card layout with image, metadata, rating, CTAs.
- **Filter drawer:** Slide-over with toggles for price, duration, media type, level, language. Saved filters appear as chips below search bar.
- **Empty states:** Provide educational copy and CTA to explore curated collections.

## Profile & Settings
- **Profile header:** Cover gradient, avatar, stats (streak, badges, enrolled courses). Edit button shows inline sheet for quick updates.
- **Timeline tabs:** Activity, Achievements, Saved Items. Activity displays chronological list of completed lessons and community contributions.
- **Settings drawer:** Accessible from profile top-right gear. Sections for Notifications, Privacy, Accessibility, Data Export.

## Support & Help
- **Help centre widget:** Persistent question mark icon opens half-screen modal with search, top FAQs, and contact support.
- **Report content flow:** From any post, long-press reveals report option → sheet collects reason → confirmation toast.

## Offline & Sync States
- Downloads manager accessible via Profile > Offline. Shows storage usage, queued items, and retry controls.
- Offline indicator at top of app when connection drops; actions requiring network disabled with tooltip explaining limitation.

## Onboarding & Subscription Flows
- **Goal setup:** After initial questionnaire, screen summarises suggested tracks with toggle to customise goal frequency. Includes progress indicator and CTA to start first lesson.
- **Subscription paywall:** Modular layout with plan cards, benefits list, and FAQ accordion. CTA buttons for monthly/annual toggle. Payment sheet includes saved methods, add new card form, and coupon field.
- **Trial reminder:** Dashboard banner showing days remaining, upgrade CTA, and link to manage billing.

## Support & Safety
- **Report & block flow:** Multi-step sheet with reason selection, optional text input, and confirmation screen referencing community guidelines.
- **Guardian controls:** For younger learners, parental consent screen with toggle for enabling safe chat and viewing activity summary.

## Accessibility & Personalisation Surfaces
- **Theme selector:** Settings screen offering light/dark/contrast themes with preview tiles and apply button. Includes system default toggle.
- **Font & display controls:** Sheet with slider for text scaling, toggle for dyslexia-friendly font, preview paragraph updating in real time.
- **Audio narration:** On content screens, floating toggle enabling audio narration with playback controls and download option.

## Achievement & Progress Visualisations
- **Milestone timeline:** Vertical timeline with milestone cards, badges, and celebration animation placeholder. Includes share buttons and option to set new goal.
- **Insights dashboard:** Section showing weekly learning time chart, streak calendar, and skill mastery heatmap with button linking to recommended actions.

## Error, Empty & Edge States
- Documented states for empty communities, no saved items, failed downloads, assessment lockouts, and maintenance downtime. Each wireframe defines illustration placement, primary/secondary copy, and relevant actions (retry, explore, contact support).

## Live Classroom & Tutor Wireframes
- **Tutor tab:** Card grid with hero featuring featured tutors, filter chips (Subject, Availability, Price), and search bar. Each card includes avatar, specialties, hourly rate, rating, and “Book” CTA referencing `App_screens_drawings.md`.
- **Booking confirmation sheet:** Three-step indicator along top (Select, Confirm, Payment). Inline policy summary, notes field, and apply coupon CTA. Error states documented for seat conflicts and payment failures.
- **Lobby screen:** Countdown timer centred with agenda list below, host/tutor info card, and checklist (Audio test, Camera test, Download resources). Quick action row for chat preview and support call.
- **Live session screen:** Full-screen video with overlay controls (mute, camera, raise hand, screen share). Bottom drawer toggles chat, Q&A, polls; includes message composer with attachments. Reaction bar overlays video corner.
- **Post-session summary:** Scorecard highlighting attendance streak, session notes, tutor review prompt, and recommended follow-up courses. Buttons for “Download recording” and “Book follow-up”.
