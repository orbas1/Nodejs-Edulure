---
{
  "slug": "analytics-revenue-enablement",
  "title": "Analytics & Revenue Enablement Curriculum",
  "summary": "Cross-functional training for finance analysts, product managers, and sales engineers on the monetisation and telemetry stack.",
  "audience": ["finance", "product", "sales"],
  "products": ["analytics-warehouse", "monetisation-suite", "executive-dashboards"],
  "tags": ["analytics", "revenue", "training", "curriculum"],
  "capabilities": ["Task 5"],
  "lastUpdated": "2025-03-04",
  "owner": "Revenue Operations",
  "timeToCompleteMinutes": 240,
  "deliverables": [
    "Finance-grade reporting checklist",
    "LookML certification quiz",
    "Sales enablement narrative"
  ]
}
---
# Analytics & Revenue Enablement Curriculum

## Cohort profile
This curriculum serves revenue operations, finance analysts, product managers, and sales engineers who translate telemetry and monetisation data into customer-facing insights. Participants must complete the operator onboarding playbook first or demonstrate equivalent experience. The curriculum integrates live exercises using the warehouse freshness monitors, monetisation finance service, and executive dashboards that were hardened in the Version 1.00 programme.

## Learning objectives
- Build a governed analytics workspace using the warehouse service export API and dbt lineage metadata.
- Diagnose revenue variance leveraging the refund-aware revenue schedules and ledger adjustments produced by the monetisation finance service.
- Present actionable narratives to customers using the executive dashboard widgets and experimentation lab analytics.
- Configure pricing experiments safely via the catalog management APIs with audit-friendly documentation.

## Module breakdown
### Module 1 – Warehouse & data governance (90 minutes)
- Provision a sandbox project tied to the analytics warehouse service with role-based access aligned to finance segregation of duties.
- Perform a live export using `/telemetry/export`, validate S3 artefacts, and register the run in the lineage model.
- Review data quality monitors and freshness alerts, mapping failure signatures to remediation steps owned by data engineering.

### Module 2 – Monetisation analytics (75 minutes)
- Inspect catalog metadata through the monetisation API and understand how recognition strategies feed the revenue schedule model.
- Analyse a partial refund scenario, confirm ledger entries, deferred balances, and Prometheus counters, and document required customer communications.
- Use the finance reconciliation job output to prepare an audit-ready monthly revenue statement that reconciles across Stripe and PayPal integrations.

### Module 3 – Storytelling and stakeholder impact (75 minutes)
- Build an executive-ready narrative by stitching enrolment trends, community engagement, and revenue KPIs into a single storyline with forward-looking recommendations.
- Practice sales call dry-runs using the experimentation lab insight cards. Participants highlight telemetry-driven product recommendations and quantify ROI.
- Capture customer follow-up actions in the enablement CRM template to ensure downstream teams deliver on commitments.

## Assessment & certification
- **Hands-on practicum** – Participants must create a revenue health dashboard segmenting performance by region, product bundle, and cohort. Deliverables include annotated screenshots, query exports, and explanation of data reliability checks.
- **Scenario defence** – Analysts defend a recommendation when data freshness is degraded. They must communicate risk mitigation and propose remediation, referencing telemetry warehouse metrics.
- **Knowledge check** – A 25-question quiz with scenario-based questions, using the LookML model catalogue. Passing score is 85%; failure triggers assignment of targeted remedial modules.

## Reinforcement & tooling
- Weekly office hours rotate between finance operations and data engineering to tackle open questions. The enablement content API exposes session agendas via tags so the LMS can automatically subscribe the right audiences.
- The curriculum deck and recorded demos live in the analytics enablement shared drive with version control tied to the release management pipeline. Updates must reference specific commit hashes from the backend repositories to maintain auditability.
- Revenue operations maintains a metrics scorecard tracking pipeline readiness, variance resolution time, and sales enablement impact. The scorecard is exported from the BI dashboards and surfaced in the governance hub.

## Change management
Whenever warehouse models or monetisation logic changes, the owner creates a curriculum change request, attaches sample datasets, updates this entry, and notifies stakeholders via the governance and communications hub. The enablement API provides a capability matrix endpoint used by the roadmap communications to spot gaps and trigger additional training material.
