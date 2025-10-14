/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { GdprComplianceProfile } from './GdprComplianceProfile';
import type { VerificationMetric } from './VerificationMetric';
import type { VerificationQueueItem } from './VerificationQueueItem';
export type VerificationAdminOverview = {
    metrics?: Array<VerificationMetric>;
    queue?: Array<VerificationQueueItem>;
    slaBreaches?: number;
    manualReviewQueue?: number;
    lastGeneratedAt?: string;
    gdpr?: GdprComplianceProfile;
};

