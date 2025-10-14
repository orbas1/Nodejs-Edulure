/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type CommunityAffiliatePayout = {
    id: number;
    affiliateId: number;
    amountCents: number;
    status: string;
    payoutReference?: string | null;
    scheduledAt?: string | null;
    processedAt?: string | null;
    failureReason?: string | null;
    metadata: Record<string, any>;
    createdAt: string;
    updatedAt: string;
};

