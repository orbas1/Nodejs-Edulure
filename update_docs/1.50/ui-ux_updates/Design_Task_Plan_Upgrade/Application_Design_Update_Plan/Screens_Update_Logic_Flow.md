# Screens Update Logic Flow

1. User authenticates; **Role Resolver service** assigns layout profile (PD-01 or LR-01) and passes widget visibility map to shell.
2. Navigation shell renders header (A1) and injects component props (theme, density) before bootstrapping dashboard data loaders.
3. Dashboard KPI cards (B1-B3) request analytics aggregates; quick actions tray (D0) concurrently fetches recent templates for prefill.
4. Provider taps **Conversion Timeline card (C1)** → opens Upload Flow with stage-specific component set (file picker, validation banner, metadata form) and persists progress via background queue.
5. Selecting media asset in Library (C1-C4) pushes **Media Detail**: card expands, version drawer (D1) animates; metadata edits (D2) fire patch request and update timeline chip inside C1.
6. Learner taps Resume carousel (B1) → Media Viewer loads; annotation rail (C0) requests tool presets, discussion toggle (C1) warms websocket before drawer opens.
7. Completing media playback triggers progress sync, showing toast and scheduling follow-up event card inside Learner Home (C2) using recommendation service payload.
8. Community alert chip (D2) funnels user into Community Hub with applied filters; moderation action updates widget state and removes badge from dashboard.
9. Settings invoked via avatar button resolves to correct subsection, using breadcrumb crumb and focus order map from accessibility spec.
10. Global search overlay is event-driven; any component can dispatch `OPEN_GLOBAL_SEARCH` to show overlay, after which deep-link target is mounted with preserved navigation stack.
11. Offline detection reroutes flows to cached views, swaps action buttons to "Retry" state, and queues actions in Offline Queue Manager until connectivity restored.
