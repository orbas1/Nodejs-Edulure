# Legal, Privacy & Compliance Release Checklist

Use this checklist when promoting Annex C7 updates (Terms, Privacy, compliance telemetry, and legal contact surfaces) to production.

## 1. Content parity
- Confirm `frontend-reactjs/src/pages/Terms.jsx`, `Privacy.jsx`, and `LegalContact.jsx` render with the shared `LegalDocumentLayout` wrapper.
- Ensure metadata (title, description, structured data) matches the requirements in `logic_flows.md` and legacy SEO snapshots.
- Verify hero summaries highlight Annex linkages (C5/C6/C7) and that footer contact details align with the legal contact page.

## 2. Compliance telemetry
- Check the backend `ComplianceService.listDsrRequests` response includes `dueInHours` and `deadlineState` for each case.
- Validate frontend dashboards ingest the metrics and expose countdowns in DSAR views.
- Update compliance operators if SLA thresholds or colour tokens changed.

## 3. Test coverage
- Run `npm --prefix backend-nodejs test -- --run --include test/complianceHttpRoutes.test.js` and confirm the DSAR route tests assert the new metrics.
- Manually load `/privacy`, `/terms`, and `/legal/contact` to ensure layout navigation works on desktop and mobile breakpoints.
- Spot-check structured data using a validator (copy JSON-LD from the page head).

## 4. Documentation artefacts
- Capture screenshots of each legal page showing hero, navigation, and contact cards.
- Archive the analytics event stream demonstrating navigation to terms/privacy/legal contact.
- Attach the updated documents from `docs/integrations/credential-invite.md` and `docs/operations/admin-approvals-checklist.md` to the release ticket.

## 5. Rollback considerations
- Keep previous terms/privacy versions available so you can republish quickly if regulators require edits.
- Disable the new DSAR countdown display if `dueInHours` fails to populate (temporary feature flag available in Runtime Config under `compliance.deadlineCountdown`).

Complete this checklist alongside Annex C7 entries in `logic_flows.md` to ensure legal, product, and operations stakeholders approve the release together.
