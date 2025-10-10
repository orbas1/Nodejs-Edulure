# Logic Flow Map – Web Application v1.00

## High-Level Journey
```
Visitor → Audience Selection → Home Hero CTA → (Onboard | Resume) → Dashboard → (Learn Library ↔ Course Detail ↔ Lesson Player) ↔ Community Hub → Settings
```

## Detailed Nodes
1. **Visitor Landing**
   - Detect role preference from cookie/local storage.
   - Show segmented navigation, set default audience.
2. **Home Hero CTA**
   - Decision: new vs returning user. If new → onboarding wizard; else → resume course.
3. **Onboarding Wizard**
   - Steps: Goals → Skills → Schedule → Summary.
   - Output: personalised plan, recommended communities.
4. **Dashboard**
   - Branch to: Learn Library (when selecting module), Communities (via highlights), Settings (via alerts).
5. **Learn Library**
   - Filter interactions update query params.
   - Selecting course triggers prefetch of lesson content.
6. **Course Detail**
   - If enrolled → resume; else -> enrol flow.
7. **Lesson Player**
   - Completion returns to course detail with next lesson highlighted.
8. **Community Hub**
   - Post creation -> updates feed + analytics event.
   - Event registration -> adds to calendar + sends notification.
9. **Settings**
   - Completed changes update profile state and may trigger dashboard alerts (e.g., security warnings cleared).

## System Integrations
- Authentication ensures secure access before Dashboard.
- Analytics instrumentation at each node transitions.
- Notification service triggered by actions (enrol, post, setting change).

## Error Handling Paths
- If data fetch fails at Dashboard, show retry card and fallback dataset.
- If onboarding incomplete, show reminder banner on Dashboard until completion.

## Visual Mapping
- Diagram stored in Figma frame `Web v1.00 / Flow Map` with swimlanes for Learner, Provider, System.
