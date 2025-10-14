/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CommunitySubscription } from './CommunitySubscription';
import type { PaymentIntentCreateResponse } from './PaymentIntentCreateResponse';
export type CommunitySubscriptionCheckoutResponse = {
    payment: PaymentIntentCreateResponse;
    subscription: CommunitySubscription;
};

