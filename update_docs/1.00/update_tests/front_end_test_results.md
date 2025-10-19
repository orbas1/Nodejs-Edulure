# Front-end Test Results – Version 1.00

- `npm test` (frontend-reactjs) — **passed**. Vitest executed 14 suites / 44 tests with coverage enabled, including the new support hub hook coverage. The run completed successfully but emitted existing React Testing Library `act(...)` warnings from the finance and support dashboard fallback tests along with long-standing admin governance/Profile warnings, matching prior runs. 【e84c94†L1-L33】【05e09d†L1-L28】
- `npm --prefix frontend-reactjs test -- --passWithNoTests` — **passed**. Coverage-enabled Vitest run executed 14 suites / 44 tests and reproduced existing Router future flag and React `act(...)` warnings without new regressions. 【b354f9†L1-L67】
