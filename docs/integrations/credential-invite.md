# Integration Credential Invitation Governance

Edulure’s credential invitation flow issues API keys and secrets in a way that satisfies Annex C5 of the logic flows handbook. These notes summarise how the latest implementation behaves and how to operate the workflow safely.

## 1. Overview
- Invitations originate from `AdminIntegrationsController` and are fulfilled through the public `/integrations/credential-invite/:token` route rendered by `frontend-reactjs/src/pages/IntegrationCredentialInvite.jsx`.
- Provider metadata, policy links, and escalation contacts are sourced from `backend-nodejs/src/services/IntegrationProviderRegistry.js` and surfaced via the `InvitePolicySummary` component.
- Secret validation uses the hardened `validateKeyStrength` helper inside `IntegrationApiKeyService.js` so short or low-entropy keys are rejected client-side and server-side.

## 2. Required artefacts
- **Provider policies:** Ensure every provider entry includes a `securityPolicyUrl`, `runbookUrl`, and escalation email. Missing data is displayed as a warning banner.
- **Audit context:** Both invite acceptance and manual refresh events emit analytics via `trackIntegrationInviteEvent` / `trackIntegrationInviteSubmit`, which should be captured in the governance warehouse.
- **Rotation metadata:** When a secret is accepted we persist rotation interval and expiry metadata to assist Annex C6 setup dashboards.

## 3. Runbook for issuing a new invite
1. In the admin console, open **Integrations → Credential governance**.
2. Generate an invitation and confirm the provider metadata (runbook, security policy, escalation contact) is populated.
3. Share the invitation link securely with the partner. Remind the recipient that secrets are visible only once.
4. When the partner submits credentials the UI validates key strength. If the key fails validation, advise the partner to regenerate using a stronger secret.
5. Confirm acceptance inside the admin console and archive the audit payload (request context, actor, provider). Attach the evidence in your release ticket.

## 4. QA checklist before each release
- Load the invite page with a fresh token and confirm policy links, rotation guidance, and countdown timers render.
- Submit intentionally weak secrets to verify both client and server validation paths reject the request.
- Accept a valid credential and ensure rotation metadata appears in the admin dashboard and Annex C6 setup history.
- Inspect the analytics stream to confirm `integration_invite` events include provider, environment, and timing metadata.

## 5. Troubleshooting
- **Documentation link missing:** Update the provider registry entry. The UI displays a warning banner until a valid URL is supplied.
- **Invite expired:** Use the “Refresh invitation” button. The refresh path replays audit context and extends the expiry without generating a new token.
- **Partner cannot access runbook:** Share the `runbookUrl` directly and confirm the runbook references this document plus Annex C5 of `logic_flows.md`.
