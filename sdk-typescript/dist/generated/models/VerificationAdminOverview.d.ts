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
//# sourceMappingURL=VerificationAdminOverview.d.ts.map