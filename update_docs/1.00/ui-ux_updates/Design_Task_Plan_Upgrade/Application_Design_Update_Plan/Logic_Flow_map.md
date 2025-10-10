# Logic Flow Map

```
[App Launch]
    ↓
[Authentication]
    ├─ Existing session valid → [Home Dashboard]
    └─ Session expired → [Sign-In → MFA → Home Dashboard]

[Home Dashboard]
    ├─ Tap "Resume" → [Media Viewer]
    │         ├─ Online → [Live Sync]
    │         └─ Offline → [Cached Playback → Sync Queue]
    ├─ Tap "Upload" → [Upload Sheet → Metadata → Publish Confirmation]
    ├─ Tap "Community Alert" → [Community Hub → Channel Detail]
    └─ Tap "Settings" → [Settings Hub]

[Media Viewer]
    ├─ Open discussion → [Comment Drawer]
    ├─ Share → [Share Sheet → Deep Link]
    └─ Complete asset → [Progress Sync → Recommendation Modal]

[Community Hub]
    ├─ Post content → [Composer → Preview → Post Success]
    ├─ Moderate → [Action Menu → Confirmation → Audit Log]
    └─ Schedule event → [Event Form → Publish → Calendar Sync]

[Settings Hub]
    ├─ Personalisation → [Appearance Toggle → Preview]
    ├─ Notifications → [Preference Matrix → Save]
    └─ Integrations → [Service Connect → OAuth → Confirmation]
```
