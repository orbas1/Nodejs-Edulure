# Events & Outbox Changes – Version 1.00

- Extended the domain event recording flow so every emitted event is persisted with parsed JSON payloads and mirrored into the new dispatch queue, enabling reliable fan-out to webhook subscribers and other async consumers.
- Added automated acknowledgement for missing or orphaned events to prevent the queue from stalling when historical records are pruned.
- Introduced a dedicated dead-letter queue for domain events that records terminal failures with metadata and metrics hooks so operations teams can investigate and replay payloads instead of losing them after the final retry. 【F:backend-nodejs/migrations/20250318121500_domain_event_dead_letters.js†L1-L55】【F:backend-nodejs/src/models/DomainEventDeadLetterModel.js†L1-L128】【F:backend-nodejs/src/services/DomainEventDispatcherService.js†L1-L247】
