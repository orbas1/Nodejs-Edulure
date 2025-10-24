# Admin Approvals & Platform Setup Checklist

This checklist supports Annex C6 by documenting how the admin approvals console operates and how to validate setup governance during releases.

## 1. Feature summary
- The approvals interface lives in `frontend-reactjs/src/pages/admin/sections/AdminApprovalsSection.jsx` and is embedded on the main admin page (`frontend-reactjs/src/pages/Admin.jsx`).
- Actions call `reviewVerificationCase` via `frontend-reactjs/src/api/setupApi.js`, which proxies to the backend `SetupController`.
- Setup progress metrics and history fetches are orchestrated by `frontend-reactjs/src/hooks/useSetupProgress.js`, which now enforces a history limit parameter respected by `backend-nodejs/src/controllers/SetupController.js`.

## 2. Pre-release validation steps
1. Open the admin console and navigate to **Approvals**.
2. Confirm waiting cases render with action buttons, SLA badges, escalation tags, and the new runbook quick links.
3. Approve and reject sample cases to ensure `reviewVerificationCase` updates the UI state and emits analytics.
4. Trigger the **Operations** history fetch and verify the timeline honours the `history_limit` query.
5. Confirm the escalation hook surfaces in the UI (badge + tooltip) when a case is beyond SLA.

## 3. Backend expectations
- `/api/v1/setup/progress` accepts `history_limit` and returns capped history arrays. Values above 50 should be clamped server-side.
- Verification case actions must include actor context and request IDs for audit logging.
- When a case transitions state, an event should appear in the operations feed for Annex C6 documentation.

## 4. Evidence to capture
- Screenshot of the approvals list with SLA badges.
- Network log showing `reviewVerificationCase` payload and response.
- Timeline export demonstrating the history limit behaviour.
- Notes from any escalations triggered via the UI.

## 5. Regression watchlist
- Action buttons disabled erroneously when multiple cases update simultaneously.
- History endpoint ignoring `history_limit` and returning oversized payloads.
- Analytics events missing provider metadata (used in Annex C5/C6 combined dashboards).

Keep this checklist alongside Annex C6 entries in `logic_flows.md` so operations, legal, and support teams share the same release criteria.
