# Screens Update Logic Flow Map

```
[Login]
   ↓
[Role Resolver]
   ├─ Provider → [Provider Dashboard]
   │                ├─ Quick Action → [Upload Flow]
   │                ├─ Tap Analytics → [Analytics Detail]
   │                └─ Alert Tap → [Community Hub]
   └─ Learner → [Learner Home]
                    ├─ Resume Card → [Media Viewer]
                    ├─ Recommendation → [Explorer Detail]
                    └─ Event Reminder → [Community Event]

[Upload Flow]
   → [File Select] → [Validation]
        ├─ Success → [Metadata Form] → [Publish Summary]
        └─ Failure → [Error Handling → Retry]

[Media Viewer]
   ├─ Discussion → [Comment Drawer]
   ├─ Resources → [Resource Sheet]
   └─ Complete → [Progress Sync → Recommendation]

[Community Hub]
   ├─ Channel → [Messages]
   ├─ Events → [Event Detail]
   └─ Members → [Member Management]

[Settings Hub]
   ├─ Personalisation
   ├─ Notifications
   └─ Integrations
```
