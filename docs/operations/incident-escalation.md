# Incident escalation runbook

This runbook keeps incident handling lightweight while ensuring critical information is captured for the admin console and
compliance dashboards.

## 1. Confirm the signal
- Review the alert in the admin activity feed and cross-check with the telemetry in the "Operations" section.
- Validate the alert severity. Escalate anything tagged `critical` or `major` to the incident channel immediately.

## 2. Stabilise the surface
- Acknowledge the alert in the admin console to stop duplicate notifications.
- If the incident affects live learning or payments, flip the corresponding feature flag to safe mode using the
  Monetization or Live Experiences sections.

## 3. Notify stakeholders
- Post a concise status update in `#incidents` with the owner, blast radius, and the mitigation being attempted.
- Trigger the on-call automation from the admin profile settings if a second pair is required.

## 4. Capture the timeline
- Add remediation steps and timestamps directly in the incident card. These notes sync to the compliance audit trail.
- Upload any supporting evidence (logs, screenshots) through the evidence attachments quick action.

## 5. Close out and learn
- Once the incident is mitigated, mark it as resolved with a clear summary and follow-up tasks.
- Schedule a short retro using the operations tooling so new learnings feed back into saved views and helper text.
