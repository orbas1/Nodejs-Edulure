import type { BillingSeatUsage } from './BillingSeatUsage';
export type BillingOverview = {
    /**
     * Label for the active subscription plan
     */
    planName: string;
    /**
     * Recurring amount in cents for the plan
     */
    planAmount?: number | null;
    /**
     * Outstanding balance due in cents
     */
    amountDueCents?: number | null;
    /**
     * ISO currency code for the plan and invoices
     */
    currency: string;
    /**
     * Raw provider status
     */
    status?: string | null;
    /**
     * Human readable status label
     */
    statusLabel: string;
    /**
     * Human readable billing interval
     */
    billingIntervalLabel?: string | null;
    /**
     * Next payment or invoice due date
     */
    nextPaymentDueAt?: string | null;
    /**
     * Indicates manual invoicing vs automatic collection
     */
    collectionMethodLabel?: string | null;
    supportTier?: string | null;
    supportNotes?: string | null;
    renewalTerm?: string | null;
    renewalNotes?: string | null;
    seatUsage?: BillingSeatUsage | null;
    /**
     * Timestamp of the latest data refresh
     */
    lastSyncedAt: string;
};
//# sourceMappingURL=BillingOverview.d.ts.map