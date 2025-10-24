export type MonetizationUsageRecord = {
    publicId: string;
    tenantId: string;
    catalogItemId?: number | null;
    productCode: string;
    accountReference: string;
    userId?: number | null;
    usageDate: string;
    quantity: number;
    unitAmountCents: number;
    amountCents: number;
    currency: string;
    source: string;
    externalReference?: string | null;
    paymentIntentId?: number | null;
    metadata: Record<string, any>;
    recordedAt: string;
    processedAt?: string | null;
};
//# sourceMappingURL=MonetizationUsageRecord.d.ts.map