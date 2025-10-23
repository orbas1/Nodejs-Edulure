# Revenue reconciliation checklist

Use this checklist whenever the revenue saved views highlight mismatches between recognised revenue, payouts, and refunds.
The steps take less than fifteen minutes and keep finance close without requiring heavyweight tooling.

## 1. Snapshot the data
- Export the "Revenue performance" report from the admin console.
- Capture the payment health breakdown, especially intents marked `requires action` or `failed`.

## 2. Match payouts to ledger entries
- Compare the exported CSV against the ledger totals in the finance workspace.
- Flag any differences greater than $100 to finance by creating a task in the finance settings panel.

## 3. Inspect refunds and discounts
- Drill into saved views for "Leakage & discounts" and review the refund rate trend.
- For spikes, open the affected cohorts or products and ensure a support ticket exists explaining the adjustment.

## 4. Resolve payment retries
- Contact learners associated with `requires action` intents using the billing templates linked in the admin console.
- Re-queue the payment attempts once the learner confirms the fix, or move the subscription to paused.

## 5. Document the outcome
- Add a reconciliation note in the revenue section summarising the variance and actions taken.
- Notify finance that reconciliation is complete so they can close the reporting window.
