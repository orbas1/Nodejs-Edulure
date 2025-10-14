/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type EbookPurchaseIntentRequest = {
    provider: 'stripe' | 'paypal';
    couponCode?: string;
    returnUrl?: string;
    cancelUrl?: string;
    brandName?: string;
    receiptEmail?: string;
};

