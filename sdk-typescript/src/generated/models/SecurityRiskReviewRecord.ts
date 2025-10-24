/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type SecurityRiskReviewRecord = {
    id?: number;
    reviewUuid?: string;
    riskId?: number;
    reviewerId?: number | null;
    reviewerName?: string | null;
    reviewerEmail?: string | null;
    status?: string;
    residualSeverity?: string;
    residualLikelihood?: string;
    residualRiskScore?: number;
    notes?: string | null;
    evidenceReferences?: Array<string>;
    reviewedAt?: string;
    nextReviewAt?: string | null;
};

