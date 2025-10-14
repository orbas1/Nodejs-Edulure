# Other Backend Updates – Version 1.50

- Added readiness tracker unit tests to codify expected behaviour for degraded, failed, and pending components so operational regressions can be caught during CI.【F:backend-nodejs/test/readinessTracker.test.js†L1-L33】
- Documented modular start commands in `package.json`, enabling release engineering to configure PM2/Systemd units on a per-service basis rather than running a single monolith.【F:backend-nodejs/package.json†L10-L26】
