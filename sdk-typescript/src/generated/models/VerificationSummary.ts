/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { VerificationDocument } from './VerificationDocument';
import type { VerificationRequirement } from './VerificationRequirement';
export type VerificationSummary = {
    /**
     * Current verification status for the user
     */
    status?: string;
    /**
     * Unique verification reference
     */
    reference?: string;
    documentsRequired?: number;
    documentsSubmitted?: number;
    requiredDocuments?: Array<VerificationRequirement>;
    outstandingDocuments?: Array<VerificationRequirement>;
    riskScore?: number;
    needsManualReview?: boolean;
    escalationLevel?: string;
    lastSubmittedAt?: string | null;
    lastReviewedAt?: string | null;
    rejectionReason?: string | null;
    documents?: Array<VerificationDocument>;
};

