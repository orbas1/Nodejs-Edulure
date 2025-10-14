/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type PaymentIntentRecord = {
    paymentId: string;
    provider: string;
    status: string;
    currency: string;
    amountSubtotal: number;
    amountDiscount: number;
    amountTax: number;
    amountTotal: number;
    amountRefunded: number;
    taxBreakdown?: Record<string, any>;
    metadata: Record<string, any>;
    couponId?: number | null;
    entityType: string;
    entityId: string;
    receiptEmail?: string | null;
    capturedAt?: string | null;
    canceledAt?: string | null;
    expiresAt?: string | null;
    failureCode?: string | null;
    failureMessage?: string | null;
    createdAt: string;
    updatedAt: string;
};

