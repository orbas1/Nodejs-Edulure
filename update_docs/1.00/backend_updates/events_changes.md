# Events & Outbox Changes – Version 1.00

- Extended the domain event recording flow so every emitted event is persisted with parsed JSON payloads and mirrored into the new dispatch queue, enabling reliable fan-out to webhook subscribers and other async consumers.
- Added automated acknowledgement for missing or orphaned events to prevent the queue from stalling when historical records are pruned.
