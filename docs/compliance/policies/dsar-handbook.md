# Data Subject Request (DSR) Handbook

Edulure processes privacy requests through the compliance domain defined in `backend-nodejs/src/database/domains/compliance.js`.
Requests are persisted in the `dsr_requests` table, surfaced by `DataSubjectRequestModel`, and orchestrated through
`ComplianceService`. This handbook documents operational steps, SLA expectations, and evidence requirements.

## Submission channels

- In-product privacy centre (preferred): authenticated users open the DSAR panel which writes directly to `dsr_requests`.
- Email: privacy@edulure.com or legal@edulure.com for enterprise contracts.
- Postal: Blackwellen Ltd (Edulure), Attn: Data Protection Officer, 71-75 Shelton Street, London, WC2H 9JQ, United Kingdom.

## Workflow overview

1. **Capture:** `ComplianceController.createDsrRequest` (future API) or the privacy centre create the row with encrypted payloads.
2. **Assignment:** Compliance leads assign reviewers via the admin console. `ComplianceService.assignDsrRequest` delegates to
   `DataSubjectRequestModel.assign`, recording audit events and CDC payloads.
3. **Review:** Reviewers handle redaction, verification, and data extraction using the secure tooling catalogue.
4. **Closure:** Status updates route through `ComplianceService.updateDsrStatus`, which persists timestamps, records CDC entries,
   and emits `dsr.status_changed` audit events.

## SLA and escalation

- **Standard SLA:** 30 calendar days from `submitted_at`. The service auto-flags overdue items using `countOverdue` and surfaces
  breaches in dashboards.
- **Extensions:** Up to 60 days with written justification and DPO approval. Update `metadata.extensionReason`.
- **Escalation path:** Reviewer → DPO → Executive Legal Counsel → Supervisory authority if mandated by law.

## Evidence & retention

- All correspondence, verification assets, and exports must be uploaded to the encrypted archive referenced in
  `metadata.evidenceVaultPath`.
- Audit logs live in `audit_events` with entity type `dsr_request`. Preserve exports for six years unless a litigation hold
  requires longer retention.
- `docs/legal/content/trust-centre.md` lists available evidence packs (ISO 27001, SOC 2, pentest summaries) for regulator review.

## Verification checklist

- Confirm the requester’s identity using the secure upload flow or enterprise identity verification (IDV) integrations.
- Validate account ownership, tenant scope, and data categories affected.
- Log all verification steps in `metadata.verificationLog` for cross-team audits.

## DSAR completion template

When closing a request:

1. Set `status = 'completed'` which auto-populates `closed_at`.
2. Attach a summary to `metadata.resolutionNotes` describing exported data sets and redactions applied.
3. Email confirmation to the requester via the templated response library (managed by SupportKnowledgeBaseService).
4. Record final confirmation timestamp and reviewer details in `metadata.completedBy`.

This handbook should be reviewed quarterly with the DPO and trust & safety leads. Update the sections above whenever new
jurisdictions are added or when automation significantly changes the workflow.
