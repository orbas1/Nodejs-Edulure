# Home Page Components

| Component | Description | Data Source |
| --- | --- | --- |
| Hero Banner | Personalised greeting, quick stats, CTA buttons | User profile service, analytics snapshot |
| Resume Carousel | Scrollable list of in-progress courses/assets with progress indicator | Learning progress API |
| Community Grid | Cards for joined communities with unread counts | Community service |
| Recommended Actions | Inline cards suggesting creation, promotion, or exploration tasks | Recommendation engine |
| Events List | Chronological list of upcoming events with RSVP actions | Events service |
| Resource Spotlight | Rotating single card featuring new blogs/resources | CMS / Release notes |
| Announcement Rail | Horizontal slider with update highlights | Change log feed |

## Interaction Notes
- Each module fetches in parallel; skeleton placeholders maintain layout.
- Modules are reorderable based on user preference (drag handles) for version 1.50 A/B testing.
- Provide quick settings menu to hide/unhide modules with persistence in settings.
