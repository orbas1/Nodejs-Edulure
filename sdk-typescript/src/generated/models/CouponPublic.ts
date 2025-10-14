/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type CouponPublic = {
    code: string;
    name: string;
    description?: string | null;
    discountType: 'percentage' | 'fixed_amount';
    discountValue: number;
    currency?: string | null;
    status: string;
    validFrom?: string | null;
    validUntil?: string | null;
    maxRedemptions?: number | null;
    perUserLimit?: number | null;
    timesRedeemed: number;
};

