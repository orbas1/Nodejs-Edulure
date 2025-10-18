# Migration Updates – Version 1.00

- Added `20250301100000_domain_event_dispatch_queue.js` to provision a durable outbox table for domain event deliveries. The migration enforces foreign keys to `domain_events`, records lock metadata, and creates indexes on status, availability, and worker ownership for efficient polling.
