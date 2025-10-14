export type CommunityAffiliate = {
    id: number;
    communityId: number;
    userId: number;
    status: string;
    referralCode: string;
    commissionRateBasisPoints: number;
    totalEarnedCents: number;
    totalPaidCents: number;
    metadata: Record<string, any>;
    approvedAt?: string | null;
    suspendedAt?: string | null;
    revokedAt?: string | null;
    createdAt: string;
    updatedAt: string;
};
//# sourceMappingURL=CommunityAffiliate.d.ts.map