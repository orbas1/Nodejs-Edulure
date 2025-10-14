export type CommunityPaywallTierUpdateInput = {
    name?: string;
    slug?: string;
    description?: string;
    priceCents?: number;
    currency?: string;
    billingInterval?: string;
    trialPeriodDays?: number;
    isActive?: boolean;
    benefits?: Array<string>;
    metadata?: Record<string, any>;
    stripePriceId?: string;
    paypalPlanId?: string;
};
//# sourceMappingURL=CommunityPaywallTierUpdateInput.d.ts.map