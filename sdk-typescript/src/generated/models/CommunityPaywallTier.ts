/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
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

