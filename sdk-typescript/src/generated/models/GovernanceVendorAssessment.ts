/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type GovernanceVendorAssessment = {
    publicId: string;
    vendorName: string;
    assessmentType: string;
    riskScore: number;
    riskLevel: string;
    status: string;
    lastAssessedAt?: string | null;
    nextReviewAt?: string | null;
    ownerEmail?: string;
    findings?: Array<Record<string, any>>;
    remediationPlan?: Record<string, any>;
    evidenceLinks?: Array<string>;
    metadata?: Record<string, any>;
};

