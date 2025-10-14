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
//# sourceMappingURL=VerificationQueueItem.d.ts.map