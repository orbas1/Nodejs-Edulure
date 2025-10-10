# Screens Update Logic Flow Map

```
[Login]
   ↓ (JWT + device fingerprint)
[Role Resolver]
   ├─ Provider → [PD-01 Provider Dashboard]
   │                ├─ Quick Action (D0) → [Upload Flow]
   │                │                        ├─ Stage 1: [File Picker Modal]
   │                │                        ├─ Stage 2: [Validation Banner]
   │                │                        ├─ Stage 3: [Metadata Form]
   │                │                        └─ Stage 4: [Publish Summary Toast]
   │                ├─ Conversion Timeline Card (C1) → [Timeline Detail Sheet]
   │                ├─ KPI Card (B1-B3) → [Analytics Detail w/ Filters]
   │                └─ Community Pulse Chip (D2) → [Community Hub - Alerts Filter]
   └─ Learner → [LR-01 Learner Home]
                    ├─ Resume Carousel Card (B1) → [Media Viewer LR-02]
                    │                                ├─ Annotation Rail (C0) → [Tool Palette]
                    │                                ├─ Discussion Toggle (C1) → [Comment Drawer]
                    │                                └─ Complete → [Progress Sync]
                    │                                                 └─ [Recommend Next Item → Explorer Detail]
                    ├─ Explorer Tile (C2) → [Explorer Detail]
                    └─ Event Strip Item (D1) → [Community Event Detail]

[Community Hub]
   ├─ Channel Card → [Messages Thread]
   │                       ├─ Message Bubble → [Reaction Tray]
   │                       └─ Moderator Tools → [Pin/Archive Modal]
   ├─ Events Tab → [Event Detail]
   │                       ├─ RSVP Button → [Confirmation Banner]
   │                       └─ Share Icon → [Share Sheet]
   └─ Members Tab → [Member Management]
                           ├─ Role Dropdown → [Role Update API]
                           └─ Remove Button → [Destructive Confirm Modal]

[Settings Hub]
   ├─ Personalisation → [Theme Selector → Preview]
   ├─ Notifications → [Channel Toggles → Save Snackbar]
   └─ Integrations → [Connected Apps → OAuth Flow]

[Global Search Overlay]
   ├─ Quick Find → [Inline Detail Peek]
   └─ Advanced Filter → [Result List → Deep Link Target]

[Offline Queue Manager]
   ├─ Pending Upload → [Retry | Cancel]
   └─ Pending Message → [Send on Connect]
```
