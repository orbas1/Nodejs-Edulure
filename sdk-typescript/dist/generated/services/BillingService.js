import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class BillingService {
    /**
     * Retrieve billing overview
     * @returns any Billing overview retrieved successfully
     * @throws ApiError
     */
    static getAccountBillingOverview() {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/account/billing/overview',
            errors: {
                401: `Missing or invalid token`,
                503: `Billing capability temporarily disabled`,
            },
        });
    }
    /**
     * List stored payment methods
     * @returns any Payment methods fetched successfully
     * @throws ApiError
     */
    static getAccountBillingPaymentMethods() {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/account/billing/payment-methods',
            errors: {
                401: `Missing or invalid token`,
                503: `Billing capability temporarily disabled`,
            },
        });
    }
    /**
     * List recent invoices
     * @returns any Invoices fetched successfully
     * @throws ApiError
     */
    static getAccountBillingInvoices() {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/account/billing/invoices',
            errors: {
                401: `Missing or invalid token`,
                503: `Billing capability temporarily disabled`,
            },
        });
    }
    /**
     * Create a billing portal session
     * @param requestBody
     * @returns any Billing portal session created
     * @throws ApiError
     */
    static postAccountBillingPortalSessions(requestBody) {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/account/billing/portal-sessions',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Missing or invalid token`,
                422: `Invalid return URL supplied`,
                503: `Billing portal disabled or unavailable`,
            },
        });
    }
}
//# sourceMappingURL=BillingService.js.map