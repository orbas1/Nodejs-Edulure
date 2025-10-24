/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type MonetizationCatalogItem = {
    publicId: string;
    tenantId: string;
    productCode: string;
    name: string;
    description?: string | null;
    pricingModel: string;
    billingInterval: string;
    revenueRecognitionMethod: string;
    recognitionDurationDays?: number;
    unitAmountCents: number;
    currency: string;
    usageMetric?: string | null;
    revenueAccount?: string;
    deferredRevenueAccount?: string;
    metadata: Record<string, any>;
    status: string;
    effectiveFrom: string;
    effectiveTo?: string | null;
    createdAt: string;
    updatedAt: string;
    retiredAt?: string | null;
};

