export type BillingPaymentMethod = {
    id: string;
    brand?: string | null;
    type?: string | null;
    last4?: string | null;
    expMonth?: number | null;
    expYear?: number | null;
    /**
     * Indicates whether this is the default payment instrument
     */
    default: boolean;
    statusLabel?: string | null;
    displayLabel?: string | null;
};
//# sourceMappingURL=BillingPaymentMethod.d.ts.map