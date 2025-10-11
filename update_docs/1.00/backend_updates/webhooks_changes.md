# Webhook Changes

- Introduced `/api/commerce/stripe/webhook` preserving raw request bodies for signature validation before logging events and advancing order/transaction states. Replay protection leverages Stripe's signing secret and idempotency keys.
- Added `/api/commerce/paypal/webhook` verifying transmission signatures via PayPal's API, enforcing webhook ID scoping, and writing immutable audit rows for dispute/capture updates.
