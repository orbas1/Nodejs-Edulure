# Screens Logic Flow Map — Structured Outline

```
START
│
├─► Check Authentication
│    ├─ Authenticated → Home
│    └─ New User → Onboarding → Signup → Profile Setup → Home
│
├─ Home
│    ├─ Resume CTA → Lesson Player → (Quiz) → Completion Modal →
│    │      ├─ Share Achievement → Social Share Sheet
│    │      └─ Back to Home (state restored)
│    ├─ Learn Tab → Course Detail →
│    │      ├─ Start Course → Lesson Player
│    │      └─ Add to Library → Library (toast confirm)
│    ├─ Community Card → Community Feed → Thread Detail
│    ├─ Events Widget → Events Calendar → Event Detail → Register
│    └─ Profile Shortcut → Profile → Settings
│
├─ Community Feed
│    ├─ Create Post → Compose Sheet → Submit → Feed (optimistic update)
│    ├─ Filter Tabs → Filtered Feed
│    └─ Notification Deep Link → Specific Thread (comment anchored)
│
├─ Library
│    ├─ Downloads Manager → Manage Storage → Success Toast
│    └─ Search Library → Course Detail
│
├─ Notifications
│    ├─ Swipe Left → Archive
│    └─ Tap Item → Deep Link (Course / Thread / Upload)
│
├─ Provider Dashboard (if provider role)
│    ├─ FAB
│    │    ├─ Upload Content → Wizard Step 1 → … → Step 5 Publish → Success → Dashboard Refresh
│    │    ├─ Schedule Event → Event Form → Confirmation
│    │    └─ Create Announcement → Community Feed (provider view)
│    ├─ Metrics Card → Audience Insights → Filters → Back to Dashboard
│    └─ Compliance Alert → Checklist Modal → Resolve → Dashboard
│
└─ Settings
     ├─ Change Preference → Instant Apply → Confirmation Toast
     ├─ Accessibility Toggle → Theme Update (global)
     ├─ Manage Integrations → OAuth Flow → Return with Status
     └─ Delete Account → Confirm Modal → Hold-to-confirm → Success/Failure State
END
```
