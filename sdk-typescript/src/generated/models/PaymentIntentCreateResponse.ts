/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PaymentTotals } from './PaymentTotals';
export type PaymentIntentCreateResponse = {
    provider: 'stripe' | 'paypal';
    paymentId: string;
    status: string;
    clientSecret?: string | null;
    approvalUrl?: string | null;
    totals: PaymentTotals;
};

