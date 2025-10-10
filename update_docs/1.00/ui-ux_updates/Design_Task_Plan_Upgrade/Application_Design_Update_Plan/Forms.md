# Forms

## Form Design Principles
- **Progressive Disclosure:** Break lengthy workflows into bite-sized steps with clear stepper navigation.
- **Inline Validation:** Provide real-time feedback with iconography and accessible messaging (ARIA live regions for errors).
- **Adaptive Layouts:** Use single-column stacked inputs on phones and split layouts on tablets.

## Key Forms
### Upload Media Form
- Fields: Title, Description, Tags (multi-select chips), Audience Level, Visibility, Attachments.
- Attachments section shows conversion queue, file size, supported formats, and estimated completion time.
- Advanced options reveal licensing, affiliate eligibility, and community cross-posting toggles.

### Event Creation Form
- Date/time picker with timezone awareness and recommended slots based on participant availability.
- RSVP limits, ticket price, waitlist toggle, and automatic reminder schedule.
- Live preview of event card and shareable link.

### Community Settings Form
- Modules for roles & permissions, channel management, moderation rules, and monetisation tiers.
- Provide inline analytics (active members, churn) to inform configuration choices.
- Contextual help tooltips linking to updated policy docs.

### Learner Profile Form
- Supports avatar upload with cropping, learning goals selection, and notification preferences.
- Section for connected services (calendar sync, note apps) with OAuth status indicators.
- Accessibility options including text scaling presets and playback speed defaults.

## Micro-Interactions
- Animated progress bar during submission for long-running tasks; offer "Continue in background" option.
- Success state surfaces summary and recommended next steps (e.g., share new deck, invite members).
- Error handling ensures data persistence; inputs retain values with descriptive remediation guidance.
