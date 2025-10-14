export type CommunityPaywallTierInput = {
    name: string;
    slug?: string;
    description?: string;
    priceCents: number;
    currency: string;
    billingInterval: string;
    trialPeriodDays?: number;
    isActive?: boolean;
    benefits?: Array<string>;
    metadata?: Record<string, any>;
    stripePriceId?: string;
    paypalPlanId?: string;
};
//# sourceMappingURL=CommunityPaywallTierInput.d.ts.map