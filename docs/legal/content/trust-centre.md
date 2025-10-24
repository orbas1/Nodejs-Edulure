# Trust Centre Evidence Catalogue

The Trust Centre centralises certifications, audit results, and security artefacts referenced by Annex C7 and the Legal Contact
page.

## Available artefacts

| Artefact | Description | Access | Update cadence |
| --- | --- | --- | --- |
| ISO/IEC 27001 certificate | External certification covering product, platform, and operations scopes | Request via trust@edulure.com (NDA required for unaffiliated reviewers) | Annual surveillance audit |
| SOC 2 Type II report | Independent audit over security, availability, and confidentiality controls | Shared securely with enterprise customers and regulators upon request | Annual |
| Penetration test summary | Executive overview of the most recent CREST-certified assessment | Delivered under NDA, includes remediation timelines and compensating controls | Biannual |
| Subprocessor register | Live inventory of subprocessors with data residency and service scopes | Public excerpt on edulure.com/trust, full detail via Trust Centre portal | Rolling updates with 30-day prior notice |
| Incident response playbook | Sanitised version of our security incident process, aligned with ISO 22301 | Shared with customers under mutual confidentiality | Reviewed quarterly |

## Request process

1. Email trust@edulure.com with organisation, role, and intended use.
2. Legal team validates NDA coverage and logs the request in the compliance evidence vault.
3. Upon approval, artefacts are shared via the secure Trust Centre portal with watermarking and download tracking enabled.
4. All requests and deliveries are stored in `audit_events` under entity type `trust_evidence` for traceability.

## Related documentation

- `frontend-reactjs/src/pages/LegalContact.jsx` – external contact page summarising this catalogue.
- `docs/compliance/policies/dpia-register.md` – privacy impact assessments referencing evidence bundles.
- `docs/compliance/policies/dsar-handbook.md` – DSAR handbook describing audit evidence retention.
