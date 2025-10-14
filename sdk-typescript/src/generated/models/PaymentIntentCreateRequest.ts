/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PaymentLineItemInput } from './PaymentLineItemInput';
export type PaymentIntentCreateRequest = {
    provider: 'stripe' | 'paypal';
    currency?: string | null;
    items: Array<PaymentLineItemInput>;
    couponCode?: string | null;
    tax?: {
        /**
         * Two-letter country code.
         */
        country: string;
        region?: string | null;
        postalCode?: string | null;
    } | null;
    entity?: {
        id: string;
        type: string;
        name?: string | null;
        description?: string | null;
    } | null;
    metadata?: Record<string, any> | null;
    receiptEmail?: string | null;
    paypal?: {
        returnUrl: string;
        cancelUrl: string;
        brandName?: string | null;
    } | null;
};

