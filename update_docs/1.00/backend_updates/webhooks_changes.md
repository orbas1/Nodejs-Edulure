# Webhook Changes

- Introduced `/api/payments/webhooks/stripe` accepting raw JSON payloads with signature verification against `STRIPE_WEBHOOK_SECRET`, dispatching to PaymentService handlers for succeeded/failed/refunded events, updating payment intents, recording ledger entries, finalising coupon redemptions, and emitting Prometheus metrics.
- Webhook controller now surfaces `received: true` responses while logging invalid signatures and configuration gaps; PayPal webhooks remain planned once provider approvals land.
