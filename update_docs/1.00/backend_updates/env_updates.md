# Environment Updates – Version 1.00

- Documented defaults for the dispatcher controls in `.env.example` (`DOMAIN_EVENTS_DISPATCH_ENABLED`, `DOMAIN_EVENTS_DISPATCH_POLL_INTERVAL_MS`, `DOMAIN_EVENTS_DISPATCH_BATCH_SIZE`, etc.) so operations teams can tune throughput, retry policy, and recovery windows per environment.
- Synchronized `test/setupEnv.js` with the new variables to guarantee Vitest exercises the dispatcher using deterministic values during automation.
