export type CommunityAffiliatePayout = {
    id: number;
    affiliateId: number;
    amountCents: number;
    status: string;
    payoutReference?: string | null;
    scheduledAt?: string | null;
    processedAt?: string | null;
    failureReason?: string | null;
    metadata: Record<string, any>;
    createdAt: string;
    updatedAt: string;
};
//# sourceMappingURL=CommunityAffiliatePayout.d.ts.map