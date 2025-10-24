export type MonetizationRevenueSchedule = {
    id: number;
    tenantId: string;
    paymentIntentId: number;
    catalogItemId?: number | null;
    usageRecordId?: number | null;
    productCode?: string | null;
    status: string;
    recognitionMethod: string;
    recognitionStart: string;
    recognitionEnd: string;
    amountCents: number;
    recognizedAmountCents: number;
    currency: string;
    revenueAccount: string;
    deferredRevenueAccount: string;
    recognizedAt?: string | null;
    metadata: Record<string, any>;
    createdAt: string;
    updatedAt: string;
};
//# sourceMappingURL=MonetizationRevenueSchedule.d.ts.map