# Component Functional Matrix – Web Application v1.50

| Component | Purpose | Key Interactions | States | Analytics |
| --- | --- | --- | --- | --- |
| Global Header | Navigation, search, notifications | Hover menus, search input, account dropdown | Default, scrolled, mobile collapsed | `nav_top_click`, `search_invoke`, `account_menu_open` |
| Sidebar Nav | Contextual navigation | Collapse/expand, item selection | Expanded, collapsed, active item | `nav_sidebar_toggle`, `nav_sidebar_select` |
| Command Palette | Quick navigation/search | Keyboard invocation, search, action selection | Idle, searching, result highlight | `command_palette_open`, `command_palette_action` |
| KPI Card | Display metrics | Hover tooltips, quick actions | Default, loading, error | `dashboard_kpi_click` |
| Resource Card | Content preview | Hover to reveal actions, assign/save/share buttons | Default, hover, saved | `resource_card_assign`, `resource_card_save` |
| Notification Item | Alert user | Mark as read, navigate to action | Unread, read, actionable | `notification_mark_read`, `notification_open` |
| Modal | Provide focused tasks | Open/close, form submission | Default, loading, error | `modal_open`, `modal_submit` |
| Toast | Feedback messaging | Auto-dismiss, manual close | Success, error, info | `toast_dismiss_manual` |
