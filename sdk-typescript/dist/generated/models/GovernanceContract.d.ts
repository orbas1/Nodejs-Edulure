export type GovernanceContract = {
    publicId: string;
    vendorName: string;
    contractType: string;
    status: string;
    ownerEmail: string;
    riskTier: string;
    contractValueCents: number;
    currency: string;
    effectiveDate?: string;
    renewalDate?: string | null;
    terminationNoticeDate?: string | null;
    obligations?: Array<{
        id: string;
        description: string;
        owner: string;
        dueAt?: string | null;
        completedAt?: string | null;
        status: string;
    }>;
    metadata?: Record<string, any>;
    lastRenewalEvaluatedAt?: string | null;
    nextGovernanceCheckAt?: string | null;
    daysUntilRenewal?: number | null;
    renewalStatus?: string | null;
    openObligations?: number | null;
    terminationNoticeDueInDays?: number | null;
};
//# sourceMappingURL=GovernanceContract.d.ts.map