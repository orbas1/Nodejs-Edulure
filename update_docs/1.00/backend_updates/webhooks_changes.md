# Webhooks Changes – Version 1.00

- Connected the new domain event dispatcher to the webhook event bus so outbound webhooks are enqueued through the existing delivery pipeline with per-subscription retry logic and circuit breaking.
