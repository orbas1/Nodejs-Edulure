/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { VerificationSummary } from './VerificationSummary';
export type VerificationQueueItem = {
    id?: number;
    reference?: string;
    status?: string;
    user?: {
        id: number;
        name: string;
        email: string;
    };
    riskScore?: number;
    escalationLevel?: string;
    documentsSubmitted?: number;
    documentsRequired?: number;
    lastSubmittedAt?: string | null;
    waitingHours?: number;
    hasBreachedSla?: boolean;
    verification?: VerificationSummary;
};

