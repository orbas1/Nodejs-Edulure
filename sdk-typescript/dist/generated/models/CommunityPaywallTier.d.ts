export type CommunityPaywallTier = {
    id: number;
    communityId: number;
    slug: string;
    name: string;
    description?: string | null;
    priceCents: number;
    currency: string;
    billingInterval: string;
    trialPeriodDays: number;
    isActive: boolean;
    benefits: Array<string>;
    metadata: Record<string, any>;
    stripePriceId?: string | null;
    paypalPlanId?: string | null;
    createdAt: string;
    updatedAt: string;
};
//# sourceMappingURL=CommunityPaywallTier.d.ts.map