import type { SecurityRiskOwner } from './SecurityRiskOwner';
export type SecurityAssessment = {
    id?: number;
    assessmentUuid?: string;
    tenantId?: string;
    assessmentType?: string;
    status?: string;
    scheduledFor?: string;
    completedAt?: string | null;
    owner?: SecurityRiskOwner;
    scope?: string | null;
    methodology?: string | null;
    findings?: string | null;
    nextSteps?: string | null;
    metadata?: Record<string, any>;
    createdAt?: string;
    updatedAt?: string;
};
//# sourceMappingURL=SecurityAssessment.d.ts.map