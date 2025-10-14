# Logic Flow Map – Web Application Design Update v1.50

| Flow | Entry Point | Actors | Key Steps | Decision Points | Exit State | Analytics Events |
| --- | --- | --- | --- | --- | --- | --- |
| Marketing Conversion | Home hero CTA | Visitor, CRM | CTA click → Lead modal → Submit form → Success message | Email valid? Consent provided? | Lead stored, nurture workflow triggered | `marketing_cta_click`, `lead_form_submit`, `lead_submit_success` |
| Cohort Enrollment | Cohort detail CTA | Visitor/Learner, Enrollment Service | View detail → Select start date → Choose plan → Checkout → Confirmation | Seats available? Payment successful? | Enrollment confirmation page, email sent | `cohort_detail_view`, `enrollment_start`, `checkout_complete` |
| Dashboard Task Completion | Provider login | Provider, Dashboard API | View dashboard → Filter tasks → Open task detail → Complete action → Success toast | Permissions? Data load success? | Task marked completed, metrics updated | `dashboard_task_open`, `task_complete`, `task_toast_ack` |
| Resource Assignment | Resource library | Provider, Resource Service | Search/filter resources → Open detail modal → Click Assign → Choose cohort/time → Confirm | Cohort selected? Resource available? | Assignment scheduled, confirmation toast | `resource_search`, `resource_assign_start`, `resource_assign_success` |
| Notification Handling | Header bell icon | User, Notification Service | Open center → Filter → Mark read / Open item | Item actionable? | Notification state updated | `notification_center_open`, `notification_mark_read`, `notification_action_click` |
| Settings Update | Profile menu → Settings | User, Settings Service | Navigate to section → Edit fields/toggles → Save/Auto-save → Confirmation | Validation pass? Re-auth required? | Settings persisted, toast displayed | `settings_section_view`, `setting_change`, `setting_save_success` |

## Supplementary Notes
- Flow diagrams maintained in Figma with swimlanes for user, UI, backend.
- Error states documented separately (e.g., payment failure, form errors) with fallback messaging.
- Analytics events standardized to align with Segment naming conventions.
