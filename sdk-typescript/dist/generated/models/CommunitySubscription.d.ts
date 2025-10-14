export type CommunitySubscription = {
    id: number;
    publicId: string;
    communityId: number;
    userId: number;
    tierId: number;
    status: string;
    startedAt?: string | null;
    currentPeriodStart?: string | null;
    currentPeriodEnd?: string | null;
    cancelAtPeriodEnd: boolean;
    canceledAt?: string | null;
    expiresAt?: string | null;
    provider: string;
    providerCustomerId?: string | null;
    providerSubscriptionId?: string | null;
    providerStatus?: string | null;
    latestPaymentIntentId?: number | null;
    affiliateId?: number | null;
    metadata: Record<string, any>;
    createdAt: string;
    updatedAt: string;
};
//# sourceMappingURL=CommunitySubscription.d.ts.map