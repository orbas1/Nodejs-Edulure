# Provider Governance Checklist & Retention API Contracts

## 1. Purpose
This document equips the future provider mobile squad with the governance playbook and API
contracts required to triage GDPR/Data Subject Requests (DSRs), fulfil deletion/retention
obligations, and emit auditable evidence directly from the provider shell. It aligns with the
compliance service shipped in Version 1.50 and extends it with provider-scoped policies so
operators can act without relying on the web console.

## 2. Governance Checklist (Provider Admin Persona)
| Phase | Owner | Required Actions | Evidence Generated |
| --- | --- | --- | --- |
| **Intake** | Provider Admin | 1. Receive push/in-app alert for new `dsr_request.status = "pending"` scoped to the provider tenant.<br>2. Validate requester identity via secure channel (email/SMS code) and record outcome in `intake_verification` field.<br>3. Claim the request using the `acknowledgeRequest` mutation to avoid duplicate handling. | DSR assignment CDC event (`operation = "ACKNOWLEDGE"`).<br>Audit event `dsr.acknowledged` containing `{providerId, assigneeId, verificationOutcome}`. |
| **Assessment** | Provider Admin + Compliance Ops | 1. Pull `consent_records` for the learner to confirm revocation state and policy lineage.<br>2. Evaluate `metadata.retentionHolds` and `metadata.legalBasis` before deleting content.<br>3. If retention hold is active, escalate by triggering `PUT /escalate` with justification. | Audit event `dsr.escalated` (when applicable).<br>CDC snapshot of `metadata` diff capturing `retentionHold` acknowledgement. |
| **Execution** | Provider Admin | 1. Execute `DELETE` actions through provider tooling (content purge, cache wipe, third-party integrations).<br>2. Call `fulfilDeletion` with `channels` array documenting which subsystems were purged (learning content, chat, payments, analytics).<br>3. Upload redacted evidence (PDF/JSON) via signed URL obtained from `requestEvidenceUpload`. | File storage reference stored in `dsr_evidence` bucket with hash + size metadata.<br>Audit event `dsr.fulfilled` + CDC `operation = "FULFIL"`. |
| **Closure** | Provider Admin + Compliance Ops | 1. Review SLA clock (`dueAt` vs. now). If risk > 0 hours, call `markOverdueReason` before completion.<br>2. Record final resolution notes, attach evidence reference IDs, and update status to `completed`.<br>3. Trigger `triggerRetentionSummary` to notify analytics + legal distribution list. | Audit event `dsr.completed` with `resolutionNotes`.<br>CDC `operation = "COMPLETE"` and notification mesh event `compliance.dsr.completed`. |

### Operational Guardrails
- **Two-person verification:** When `metadata.requiresDualSignoff === true`, the provider shell must enforce secondary approval before allowing `fulfilDeletion`. The Flutter contracts expose `requiresDualSignoff` for this purpose.
- **Retention clocks:** The client must surface the SLA countdown derived from `dueAt` and highlight requests with `< 24h` remaining using the severity palette defined for compliance dashboards.
- **Evidence hygiene:** All uploads must pass SHA-256 hashing locally; the hash is transmitted alongside `evidenceUrl` to allow the compliance service to validate tampering.

## 3. API Contracts
Provider endpoints share the compliance service but enforce the `provider_admin` audience through OAuth scopes. All responses follow the JSON structures below and emit audit + CDC events automatically.

### 3.1 List DSR Requests
`GET /api/v1/provider/compliance/dsr/requests`

**Query Parameters**
- `status` – optional (`pending|in_progress|escalated|completed|overdue`).
- `dueBefore` – ISO8601 timestamp for SLA filtering.
- `limit`, `offset` – pagination.

**Response**
```json
{
  "data": [
    {
      "requestUuid": "6d01df0d-0cfd-4ae1-9e85-1ce69333c51c",
      "tenantId": "academy-ops-01",
      "userId": "learner-491",
      "requestType": "deletion",
      "status": "pending",
      "submittedAt": "2025-02-09T08:17:14.000Z",
      "dueAt": "2025-02-16T08:17:14.000Z",
      "handledBy": null,
      "escalated": false,
      "slaDays": 7,
      "requiresDualSignoff": true,
      "metadata": {
        "retentionHolds": [],
        "legalBasis": "legitimate_interest",
        "linkedSystems": ["learning-content", "community-feed"],
        "evidence": []
      }
    }
  ],
  "total": 14,
  "overdue": 3
}
```

### 3.2 Acknowledge / Assign Request
`POST /api/v1/provider/compliance/dsr/requests/{requestUuid}/acknowledge`

**Body**
```json
{
  "assigneeId": "provider-admin-21",
  "verificationChannel": "secure-email",
  "verificationOutcome": "verified",
  "notes": "Identity challenge passed via encrypted email link"
}
```

**Success Response** – 200 with updated request payload (same shape as list). Failure emits 409 if already claimed.

### 3.3 Escalate Request
`PUT /api/v1/provider/compliance/dsr/requests/{requestUuid}/escalate`

**Body**
```json
{
  "reason": "Retention hold flagged by legal team",
  "contact": {
    "name": "Compliance Duty Manager",
    "email": "compliance@provider.com"
  }
}
```
Returns updated request + `escalatedAt` timestamp.

### 3.4 Fulfil Deletion Workflow
`POST /api/v1/provider/compliance/dsr/requests/{requestUuid}/fulfil`

**Body**
```json
{
  "channels": [
    {
      "system": "learning-content",
      "completedAt": "2025-02-10T10:14:05.000Z",
      "operatorId": "provider-admin-21",
      "notes": "Modules purged, cache invalidated"
    },
    {
      "system": "community-feed",
      "completedAt": "2025-02-10T10:45:19.000Z",
      "operatorId": "provider-admin-21",
      "notes": "Posts queued for scrub"
    }
  ],
  "evidence": [
    {
      "type": "pdf",
      "hash": "0c9b1a8c1c88996d8f22a57a02d9dbd157ac56e3a8bba7b07dbbf3a899c6c0a5",
      "signedUrl": "https://files.edulure.com/provider-compliance/dsr/6d01df0d/evidence.pdf",
      "expiresAt": "2025-02-15T08:17:14.000Z"
    }
  ],
  "resolutionNotes": "Deletion completed across owned systems; waiting for CRM confirmation"
}
```

### 3.5 Upload Evidence URL
`POST /api/v1/provider/compliance/dsr/requests/{requestUuid}/evidence`

**Body**
```json
{
  "filename": "deletion-proof.pdf",
  "contentType": "application/pdf",
  "sizeBytes": 482394
}
```

**Response**
```json
{
  "signedUrl": "https://files.edulure.com/provider-compliance/dsr/6d01df0d/evidence.pdf",
  "hashAlgorithm": "sha256",
  "maxUploadMinutes": 30
}
```

### 3.6 Complete Request
`POST /api/v1/provider/compliance/dsr/requests/{requestUuid}/complete`

**Body**
```json
{
  "resolutionNotes": "CRM ticket #184771 closed; legal confirmed removal",
  "evidenceReferences": [
    "https://files.edulure.com/provider-compliance/dsr/6d01df0d/evidence.pdf"
  ],
  "overdueReason": null
}
```

## 4. Consent & Policy Contracts
To honour deletion requests, the provider shell must reference the consent ledger to avoid
processing revoked data. The following endpoints mirror the admin console with provider scoping.

- `GET /api/v1/provider/compliance/consents/{userId}` → Returns `consentUuid`, `policyVersion`,
  `status`, `channel`, `grantedAt`, `revokedAt`, and `metadata.redactionScope`.
- `POST /api/v1/provider/compliance/consents/{consentUuid}/revoke` → Allows provider admins to
  revoke a consent captured by provider workflows while recording `revocationSource = "provider-app"`.
- `GET /api/v1/provider/compliance/policies?status=active` → Supports linking policy PDFs and
  copy decks in the Flutter UI.

## 5. Mobile Contract Mapping
The Flutter provider shell must implement the `ProviderComplianceContracts` models introduced in
`lib/provider/runtime/provider_compliance_contracts.dart`:

- `ProviderDsrRequest` – immutable data class mirroring the JSON payload above with helpers for SLA
  severity (`slaStatus`) and dual-signoff detection.
- `ProviderConsentRecord` – exposes policy metadata and revocation helpers for UX copy.
- `ProviderRetentionChecklist` – encapsulates client-side validation (e.g., verifying evidence hash
  presence before enabling completion actions).

These contracts integrate with the existing `ProviderCapabilityBridge` so RBAC metadata and
capability access envelopes gate each mutation. The bridge exposes the capability keys:

- `compliance.dsr.manage`
- `compliance.dsr.escalate`
- `compliance.consent.revoke`

## 6. Implementation Notes & SLAs
- **Latency target:** API responses must complete within 500 ms P95 for list/acknowledge calls; fulfil
  and evidence uploads may extend to 2 seconds due to storage operations.
- **SLA reminders:** Clients trigger local notifications at 24h and 4h before `dueAt` to prevent SLA
  breaches; when `overdue` is true, the client pre-fills `overdueReason` with templated copy drawn
  from the design copy deck.
- **Telemetry:** Every mutation attaches `observability` payloads (`clientVersion`, `deviceId`,
  `networkQuality`) enabling compliance ops to correlate slowdowns with device state.
- **Security:** OAuth scopes must include `provider.compliance` and JWT tokens must embed
  `tenantId` to prevent cross-tenant access. All responses omit PII values except `displayName` when
  explicitly permitted by policy metadata.

## 7. Next Steps for Engineering
1. Wire provider-authenticated routes in the Express router, delegating to `ComplianceService` with
   tenant scoping and audit context derived from the JWT claims.
2. Extend the TypeScript SDK generator to emit provider-compliance clients for React/Flutter web.
3. Create Pact tests ensuring provider routes remain compatible with the mobile contract documented
   above.
4. Document dual-signoff copy and escalation flows in the design system (see Design Plan update) so
   provider UX remains aligned with legal requirements.
