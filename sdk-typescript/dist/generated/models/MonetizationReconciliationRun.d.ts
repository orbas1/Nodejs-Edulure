export type MonetizationReconciliationRun = {
    id: number;
    tenantId: string;
    windowStart: string;
    windowEnd: string;
    status: string;
    invoicedCents: number;
    usageCents: number;
    recognizedCents: number;
    deferredCents: number;
    varianceCents: number;
    varianceRatio: number;
    metadata: Record<string, any>;
    createdAt: string;
    updatedAt: string;
};
//# sourceMappingURL=MonetizationReconciliationRun.d.ts.map