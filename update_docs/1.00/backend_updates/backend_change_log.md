# Backend Change Log – Version 1.00

- Hardened the event outbox by pairing `DomainEventModel` with a dedicated dispatch queue, worker integration, and resilience controls (retry, jitter, recovery) to meet SLA expectations for automation flows promised in 1.00.
