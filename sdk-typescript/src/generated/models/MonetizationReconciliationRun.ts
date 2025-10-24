/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
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

