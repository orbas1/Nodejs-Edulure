/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
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

