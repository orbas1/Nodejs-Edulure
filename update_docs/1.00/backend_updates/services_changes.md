# Service Changes – Version 1.00

- Added `DomainEventDispatcherService` to orchestrate outbox processing with configurable polling, exponential backoff, jitter, stuck-job recovery, and Prometheus instrumentation. The service publishes dispatched events to the webhook bus using correlation-aware metadata so subscriber webhooks receive consistent payloads.
- Updated the worker bootstrap to register the dispatcher alongside existing schedulers. Readiness probes now expose a `domain-event-dispatcher` component that reports degraded state when the pipeline is disabled and surfaces start-up failures to logs.
- Extended `DomainEventModel` so every recorded event can enqueue a dispatch entry within the same transaction while preserving backward compatibility for services that pass custom connections. JSON payloads are normalised to avoid parsing bugs during replay.
