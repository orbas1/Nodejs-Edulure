# Backend Test Results – Version 1.00

- `npm test` (backend-nodejs) — **failed**. Several integration suites (`IntegrationDashboardService`, `IntegrationOrchestratorService`) attempted to open MySQL connections and aborted with `ECONNREFUSED` because no database service is available in the execution environment. Dashboard unit coverage, including the new instructor workspace assertions, executed successfully before the failure. 【534d72†L1-L159】
