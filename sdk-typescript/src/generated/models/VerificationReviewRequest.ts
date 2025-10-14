/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type VerificationReviewRequest = {
    status: 'approved' | 'rejected' | 'resubmission_required';
    riskScore?: number;
    rejectionReason?: string | null;
    escalationLevel?: 'none' | 't1' | 't2' | 't3';
    policyReferences?: Array<string>;
};

