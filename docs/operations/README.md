# Operations Handbook

This handbook provides quick-reference procedures for the admin console task list, saved views, and integration workflows.

## Incident response escalation

- **Severity definitions** – S0 (platform-wide outage), S1 (core monetisation impact), S2 (degraded non-critical feature), S3 (informational). Map alerts to severities using the admin activity feed trend line.
- **Paging sequence** – Page the on-call operator in PagerDuty, then escalate to the incident commander if no acknowledgement within 5 minutes. The policy owner (`Trust & Safety`) must be looped in for S0/S1 incidents.
- **Communication templates** – Use the shared templates in `docs/operations/templates/incident-*.md` when notifying the community and enterprise customers.
- **Post-incident checklist** – Capture timeline, attach saved revenue views proving recovery, file retrospective issue in the Operations project, and update playbooks.

## Revenue reconciliation

- **Daily saved-view review** – Load the `All revenue` saved view for the previous 24 hours, export the CSV, and compare against the finance ledger totals.
- **Payment intent sampling** – From the selected view, drill into failed intents and document at least five remediation steps. Ensure success rates remain above 98% for the 30-day window.
- **Currency mix validation** – Confirm the gross share per currency matches payout expectations. Investigate any delta greater than 5% week-over-week.
- **Refund leakage guardrails** – Track recognised vs. refunded totals; if refunds exceed 8% of recognised revenue, schedule a review with Finance Operations.

## Integration runbooks

- **API key rotation** – Rotate third-party API keys quarterly; document changes in the integrations register and update environment variables via the runtime config service.
- **Webhook delivery** – Monitor webhook failure dashboards; retry failed deliveries via the Admin tools section before escalating to partners.
- **Sandbox parity** – Ensure partner sandbox environments mirror production settings after each release. Use the integration summary cards to verify feature toggles.
- **Audit logging** – Export integration task completion logs weekly and archive them in secure storage for compliance review.
