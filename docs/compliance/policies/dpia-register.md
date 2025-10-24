# DPIA Register Summary

This register catalogues the Data Protection Impact Assessments (DPIAs) conducted across Edulure products. The inventory is
aligned with Annex C7 governance controls and stored alongside legal notices for quick auditor access.

| DPIA ID | Process | Primary Risks | Mitigations | Last Review | Owner |
| --- | --- | --- | --- | --- | --- |
| DPIA-2024-EDU-01 | Learner analytics pipeline | Identification of behavioural patterns without consent | Consent records enforced via ComplianceService, minimised retention windows, pseudonymised exports | 14 Jan 2025 | Data Protection Officer |
| DPIA-2024-EDU-02 | Community moderation with AI assistance | Automated flagging errors, bias, false positives | Human-in-the-loop review, escalation triggers, transparency copy in community policy | 12 Nov 2024 | Trust & Safety Lead |
| DPIA-2025-EDU-03 | Enterprise SSO onboarding | Misconfiguration leading to privileged access | Just-in-time provisioning, dual approvals, automated audit trails, tenant isolation | 20 Feb 2025 | Head of Security |

## Maintenance

- Update entries whenever new features require impact assessments or when mitigations change.
- Evidence packs (risk assessments, approvals, consultation summaries) are filed in the compliance evidence vault and cross-
  referenced in `docs/legal/content/trust-centre.md`.
- Review cadence: quarterly with the DPO, Legal Counsel, and Security.

## Related resources

- `backend-nodejs/src/models/DataSubjectRequestModel.js` – ensures DSAR workflow integrates with DPIA outcomes.
- `docs/compliance/policies/dsar-handbook.md` – operational guidelines for data subject rights.
- `frontend-reactjs/src/pages/LegalContact.jsx` – public-facing contact routes summarised from this register.
