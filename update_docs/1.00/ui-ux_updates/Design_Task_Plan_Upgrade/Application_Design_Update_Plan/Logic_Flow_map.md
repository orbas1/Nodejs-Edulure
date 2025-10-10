# Logic Flow Map — High-Level Diagram

```
[App Launch]
   ↓ (Auth token valid?)
[Yes] → [Profile complete?]
            ↓Yes                      ↓No
         [Role switch?]            [Profile Setup]
            ↓                     (collect avatar, interests)
   ┌───────Yes───────┐
   │                 │
[Role Selector]   [Default Role]
   │                 │
[Provider Shell]  [Learner Shell]

Learner Shell Flow:
[Home]
  ├─ Resume CTA → [Lesson Player] → [Quiz] → [Completion]
  ├─ Learn Tab → [Course Detail] → [Lesson Player]
  ├─ Community Tab → [Feed] → [Thread]
  ├─ Library Tab → [Downloads]
  └─ Profile → [Settings]

Provider Shell Flow:
[Dashboard]
  ├─ FAB → {Upload Wizard → Publish, Schedule Event, Announcement}
  ├─ Content → [Course Builder]
  ├─ Community → [Moderation Queue]
  ├─ Earnings → [Payout Detail]
  └─ Settings → [Billing]

System Overlays:
- Offline Banner overlays any screen; actions reroute to Downloads.
- Compliance Modal overlays provider screens until resolved.
- Push Notification → Deep link into target route with context anchor.
```
