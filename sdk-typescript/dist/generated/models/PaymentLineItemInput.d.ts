export type PaymentLineItemInput = {
    id?: string | null;
    name?: string | null;
    description?: string | null;
    /**
     * Unit price in cents.
     */
    unitAmount: number;
    quantity?: number;
    taxExempt?: boolean;
    metadata?: Record<string, any> | null;
};
//# sourceMappingURL=PaymentLineItemInput.d.ts.map