# Config Changes – Version 1.00

- Introduced `DOMAIN_EVENTS_DISPATCH_*` environment switches in `env.js` to control queue polling cadence, batch size, retry ceilings, jitter, and recovery behaviour for the new domain event dispatcher. These values flow through to runtime configuration, readiness logging, and the test harness so lower environments can dial the worker to safe limits.
