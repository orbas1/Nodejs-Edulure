# Webhooks Changes – Version 1.00

- Connected the new domain event dispatcher to the webhook event bus so outbound webhooks are enqueued through the existing delivery pipeline with per-subscription retry logic and circuit breaking.
- Added integration webhook receipt logging and idempotent verification for Stripe events, ensuring duplicate deliveries are deduplicated, skew windows audited, and receipt outcomes persisted for operations visibility.
