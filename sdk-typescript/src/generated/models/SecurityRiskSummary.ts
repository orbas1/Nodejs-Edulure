/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type SecurityRiskSummary = {
    statusTotals?: Record<string, number>;
    totals?: {
        risks?: number;
        dueForReview?: number;
        openFollowUps?: number;
    };
    averages?: {
        inherent?: number;
        residual?: number;
    };
    nextReviewAt?: string | null;
    lastUpdatedAt?: string | null;
    topOwners?: Array<{
        owner?: string | null;
        total?: number;
    }>;
    topTags?: Array<{
        tag?: string;
        count?: number;
    }>;
};

