# New Backend Files – Version 1.00

- `migrations/20250301100000_domain_event_dispatch_queue.js` — creates the domain event dispatch queue table with indexes, locking metadata, and timestamps.
- `src/models/DomainEventDispatchModel.js` — data access layer for the dispatch queue handling claims, acknowledgements, retries, and recovery scanning.
- `src/services/DomainEventDispatcherService.js` — background worker that publishes domain events to webhooks with instrumentation and backoff management.
- `test/domainEventDispatcherService.test.js` — Vitest coverage verifying success, retry, and acknowledgement behaviour of the dispatcher.
