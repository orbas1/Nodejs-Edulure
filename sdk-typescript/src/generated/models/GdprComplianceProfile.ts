/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type GdprComplianceProfile = {
    dsar?: {
        open?: number;
        dueSoon?: number;
        overdue?: number;
        completed30d?: number;
        averageCompletionHours?: number;
        slaHours?: number;
        owner?: string;
        nextIcoSubmission?: string;
    };
    registers?: Array<{
        id?: string;
        name?: string;
        owner?: string;
        status?: string;
        lastReviewed?: string;
        nextReviewDue?: string;
        coverage?: Array<string>;
        retentionPolicy?: string;
    }>;
    controls?: Record<string, any>;
    ico?: {
        registrationNumber?: string;
        status?: string;
        feeTier?: string;
        renewalDue?: string;
        lastSubmitted?: string;
        publicRegisterUrl?: string;
        reportingOwner?: string;
    };
};

