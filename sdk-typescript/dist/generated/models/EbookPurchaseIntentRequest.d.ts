export type EbookPurchaseIntentRequest = {
    provider: 'stripe' | 'paypal';
    couponCode?: string;
    returnUrl?: string;
    cancelUrl?: string;
    brandName?: string;
    receiptEmail?: string;
};
//# sourceMappingURL=EbookPurchaseIntentRequest.d.ts.map