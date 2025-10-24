export type BillingInvoice = {
    id: string;
    number?: string | null;
    issuedAt?: string | null;
    dueAt?: string | null;
    /**
     * Invoice total in cents
     */
    amountDueCents: number;
    /**
     * Invoice currency (ISO code)
     */
    currency: string;
    status?: string | null;
    /**
     * Human readable invoice status label
     */
    statusLabel: string;
    downloadUrl?: string | null;
};
//# sourceMappingURL=BillingInvoice.d.ts.map