export type CommunityPointTransaction = {
    id: number;
    communityId: number;
    userId: number;
    awardedBy?: number | null;
    deltaPoints: number;
    balanceAfter: number;
    reason: string;
    source: string;
    referenceId?: string | null;
    metadata: Record<string, any>;
    awardedAt: string;
};
//# sourceMappingURL=CommunityPointTransaction.d.ts.map