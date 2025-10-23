# Integrations hub guide

Follow this guide whenever partners request new credentials or webhook changes. The aim is to complete the request without
risking live data flows.

## 1. Review the integration request
- Check the integrations hub section of the admin console for pending requests or expiring tokens.
- Confirm the requesting partner and scope. Decline any request missing contract coverage.

## 2. Rotate credentials safely
- Generate new API keys using the integrations tooling and label them with the partner name and rotation date.
- For webhooks, stage changes in preview first, then promote to production once the callback health check passes.

## 3. Update monitoring
- Ensure the integrations saved view includes the new key or webhook with a success metric.
- Set a reminder for the next rotation window in the operations calendar.

## 4. Communicate completion
- Send the partner the new credentials using the secure channel listed in the request ticket.
- Post an update in the operations channel summarising what changed and who approved it.

## 5. Archive the previous configuration
- Disable the old key or webhook endpoint once the partner confirms a successful switchover.
- Store any relevant artefacts (requests, acknowledgements) with the integration record for compliance.
