# Logic Flow Map

## Primary Navigation Routes
- `/home`
  - Fetch personalised feed modules → Render hero + resume + community highlights.
- `/explorer`
  - Load global search overlay → Query Meilisearch service → Display results tabs (Courses, Communities, People, Assets).
- `/dashboard`
  - Determine role (provider/admin) → Load analytics widgets → Provide export & filters.
- `/communities/:id`
  - Fetch hub layout → Render modular widgets → Provide action drawers for create/manage.
- `/assets`
  - Fetch asset library by type → Display grid/list view → Provide upload drawer.
- `/settings`
  - Load profile summary → Render tabbed settings forms → Access audit logs.

## Interaction Flow Diagram (Textual)
1. **User logs in** → system resolves role → loads global navigation with appropriate shortcuts.
2. **User selects module from nav** → route guard ensures prerequisites (e.g., provider onboarding complete) → fetch relevant data → display skeleton until data resolves.
3. **User interacts (filters, create, edit)** → UI triggers service call → optimistic update → on success show toast; on failure revert state and highlight issue.
4. **Background events** (upload complete, follow request) → push notification → user opens drawer → acts (approve, view details).
5. **User toggles theme or layout** → update CSS variables → persist preference to account settings.

## Service Dependencies
- Authentication service for session state.
- Recommendation service for home feed.
- Meilisearch for explorer results.
- Analytics pipeline for dashboards.
- Messaging service for community chat and notifications.

## Error Handling
- Standardised error boundary per route with support article links.
- Offline mode caches last successful fetch for read-only viewing.
- Provide retry buttons on cards when API call fails.
