# Provider-Focused Changes

- Role hierarchy updates ensure future provider/admin routes inherit instructor permissions without duplication.
- Content analytics endpoints (`/api/content/assets/{assetId}/analytics`) surface engagement metrics required by provider dashboards.
- Finance endpoints (`/api/payments/reports/summary`, `/api/payments/{paymentId}/refunds`, `/api/payments/coupons/{code}`) unlock instructor/provider dashboards for revenue reporting, refund governance, and coupon performance without bespoke queries.
