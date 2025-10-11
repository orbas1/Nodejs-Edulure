# Screen Copy & Messaging – Version 1.00

## Tone & Voice Principles
- **Confident, supportive, and aspirational.** Use active verbs and inclusive language.
- **Clarity first.** Limit marketing jargon, highlight direct value or action.
- **Consistency.** Align CTA and navigation labels with product taxonomy (Learn, Communities, Insights).

## Key Copy Blocks by Screen

### SCR-00 Home
- **Hero Eyebrow:** "Future-ready learning" (14px uppercase).
- **Hero Headline:** "Grow talent with guided, data-driven learning." (Clamp 40–56px).
- **Supporting Copy:** "Edulure connects your teams to curated courses, community mentors, and real-time insights in one platform."
- **Primary CTA:** "Start your personalised plan".
- **Secondary CTA:** "Explore courses".
- **Value Pillars:**
  - "Curated library" – "700+ expertly-vetted courses with updated syllabi." (16px body).
  - "Mentor network" – "Pair with industry mentors and peer cohorts.".
  - "Proof of impact" – "Track outcomes with real-time analytics dashboards."
- **Testimonial Highlight:** Quote 18px italic, attribution 16px with company name.

### SCR-01 Onboarding
- **Step Titles:** "Define your goals", "Assess your skills", "Plan your schedule", "Review & confirm".
- **Helper Copy:** Provide sample suggestions (e.g., "Select up to three focus areas" 14px secondary text).
- **Success Toast:** "Plan saved. Let’s build your learning path."

### SCR-02 Dashboard
- **KPI Labels:** "Active courses", "Completion rate", "Skill progress", "Community engagement".
- **Tasks Rail Header:** "Today’s focus" with subtext "Complete these actions to stay on track.".
- **Announcements Banner:** "New AI fundamentals track launches next week."
- **Empty States:** "No tasks pending. Explore the Learn Library to add more."

### SCR-03 Learn Library
- **Search Placeholder:** "Search courses, instructors, or skills".
- **Filter Labels:** "Level", "Duration", "Format", "Certification".
- **Empty State Message:** "Refine your filters or request a new course." with CTA "Request content".
- **Card Copy:** Course title max 60 chars, description 120 chars, metadata line "6 modules • Intermediate • 4h 30m".

### SCR-04 Course Detail
- **Hero Badge:** "Featured" or "New" where applicable.
- **Stats:** "Learners enrolled", "Average rating", "Updated" (dates spelled out, e.g., "Updated 12 July 2024").
- **CTA Copy:** "Enrol now" / "Resume learning".
- **Syllabus Section Title:** "What you’ll learn".
- **Instructor Bio:** 16px copy with CTA "View full profile".
- **Review Prompt:** "Share your experience" button for enrolled learners.

### SCR-05 Lesson Player
- **Video Title:** 32px, descriptive (e.g., "Design Thinking Foundations – Module 2").
- **Transcript Search Placeholder:** "Search transcript".
- **Notes Drawer Title:** "Your notes" with add placeholder "Type to capture insights…".
- **Completion Toast:** "Lesson complete! Next up: [Lesson Title]."

### SCR-06 Communities Hub
- **Tab Labels:** "For you", "Trending", "Events", "Resources".
- **Composer Placeholder:** "Start a conversation…".
- **Event CTA:** "Save your spot".
- **Empty State:** "You’re not following any communities yet. Discover groups tailored to your goals.".

### SCR-07 Community Detail
- **Hero CTA:** "Post update", secondary "Invite members" (admin only).
- **Stats Labels:** "Members", "Active this week", "Upcoming events".
- **Pinned Resources:** Title + short descriptor (max 80 chars).

### SCR-08 Profile
- **Hero Headline:** "Hi, I’m {Name}" with subtitle "Learning {Focus Area}".
- **Achievement Section Title:** "Recent milestones".
- **Timeline Items:** Use past-tense, e.g., "Completed AI Fundamentals" with timestamp.
- **Skill Heatmap Legend:** "Mastery levels from 1 (exploring) to 5 (expert)."

### SCR-09 Settings
- **Tabs:** "Overview", "Account", "Notifications", "Security", "Billing", "Integrations".
- **Form Labels:** Use sentence case ("Full name", "Work email").
- **Alerts:** "Enable multi-factor authentication to protect your account.".
- **Success Toast:** "Preferences saved".

### SCR-10 Support
- **Hero Headline:** "We’re here to help.".
- **FAQ Intro:** "Find quick answers or reach out to our support team.".
- **Ticket Form Labels:** "Issue category", "Subject", "Describe your issue", "Attachments".
- **Confirmation:** "Ticket submitted. We’ll respond within 1 business day.".

### SCR-11 Admin Analytics
- **Filter Labels:** "Date range", "Learner cohort", "Metric".
- **Panel Titles:** "Revenue this month", "Completion trends", "Top-performing cohorts", "Engagement funnel".
- **Empty State:** "Connect your BI integration to unlock additional data sources.".

### SCR-12 Admin Content
- **Table Headers:** "Course", "Status", "Owner", "Last updated", "Enrollment", "Actions".
- **Bulk Toolbar Message:** "3 courses selected" dynamic counter.
- **Empty State CTA:** "Create new course".

## Microcopy Standards
- Error messages: "Something went wrong. Please try again." with contextual instructions.
- Tooltip copy limited to 80 characters.
- Button labels use imperative verbs ("Save", "Publish", "Invite").
- Avoid ampersands; use "and".

## Localisation Notes
- Provide translation keys matching `i18n/web_v1.json` (e.g., `dashboard.tasks.header`).
- Reserve space for languages with longer strings (German/Spanish) by leaving 20% buffer in layout.
