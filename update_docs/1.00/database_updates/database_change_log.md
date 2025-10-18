# Database Change Log – Version 1.00

- Introduced a `domain_event_dispatch_queue` table supporting outbox semantics with retry tracking, lock ownership, and metadata columns to back the new automation pipeline.
