# Update Index

## Release Overview
- **Release Name:** Horizon Alignment Update (Q2 FY2025)
- **Primary Objectives:**
  - Deliver a unified learning experience across web and mobile applications.
  - Harden security posture with RBAC refinements, audited telemetry, and consistent CORS policies.
  - Ship a production-ready testing and rollout plan spanning backend, frontend, and mobile clients.

## Document Map
| Section | Purpose | Owner |
| --- | --- | --- |
| [`update_plan.md`](./update_plan.md) | Defines scope, deliverables, risks, and communication cadence. | Program Management |
| [`update_milestone_list.md`](./update_milestone_list.md) | Timeline of critical checkpoints with success criteria. | Delivery Lead |
| [`update_task_list.md`](./update_task_list.md) | Trackable backlog slice with status, effort, and dependencies. | Cross-functional Leads |
| [`update_progress_tracker.md`](./update_progress_tracker.md) | Real-time measurement of execution health across quality dimensions. | PMO |
| [`ui-ux_updates/`](./ui-ux_updates/) | Experience design, logic, and styling deltas for mobile and web clients. | Product Design |
| [`update_tests/`](./update_tests/) | Automation scripts, execution reports, and remediation notes. | QA Engineering |
| [`frontend_updates/`](./frontend_updates) & [`backend_updates/`](./backend_updates) | Component-level implementation details. | Engineering Leads |
| [`pre-update_evaluations/`](./pre-update_evaluations) | Baseline audits used to benchmark progress. | Architecture |
| [`upload_brief.md`](./upload_brief.md) | Release asset packaging checklist. | Release Management |

## Change Control Workflow
1. **Initiation:** Open a change request referencing this index and expected scope.
2. **Design & Review:** Align stakeholders using the UI/UX updates and the update plan for feasibility sign-off.
3. **Implementation:** Execute tasks tracked in the task list; update progress metrics daily.
4. **Quality Assurance:** Run automation scripts from `update_tests/test_scripts` and log outcomes in the results files.
5. **Approval:** Require security, QA, and product sign-off before tagging the release.
6. **Deployment:** Follow infrastructure runbooks referenced in `update_plan.md` and document the final deployment in `upload_brief.md`.

## Stakeholder Directory
- **Product:** aria.chen@edulure.com (Product Director)
- **Engineering:** devon.park@edulure.com (Principal Engineer)
- **Security & Compliance:** nadia.raza@edulure.com (Security Lead)
- **Customer Success:** jordan.mei@edulure.com (Lead CSM)
- **Release Management:** oliver.holt@edulure.com (Release Manager)

## Communication Cadence
- **Daily:** Slack stand-up (`#release-horizon`), update progress tracker.
- **Twice Weekly:** Cross-functional review (Mon/Thu 15:00 UTC).
- **Pre-release:** Final go/no-go meeting 24 hours before deployment.
- **Post-release:** 48-hour hypercare with hourly incident checks and 14-day follow-up retro.
