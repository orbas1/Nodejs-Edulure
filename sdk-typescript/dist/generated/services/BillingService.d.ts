import type { BillingInvoice } from '../models/BillingInvoice';
import type { BillingOverview } from '../models/BillingOverview';
import type { BillingPaymentMethod } from '../models/BillingPaymentMethod';
import type { BillingPortalSession } from '../models/BillingPortalSession';
import type { BillingPortalSessionRequest } from '../models/BillingPortalSessionRequest';
import type { StandardResponse } from '../models/StandardResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
export declare class BillingService {
    /**
     * Retrieve billing overview
     * @returns any Billing overview retrieved successfully
     * @throws ApiError
     */
    static getAccountBillingOverview(): CancelablePromise<(StandardResponse & {
        data?: BillingOverview;
    })>;
    /**
     * List stored payment methods
     * @returns any Payment methods fetched successfully
     * @throws ApiError
     */
    static getAccountBillingPaymentMethods(): CancelablePromise<(StandardResponse & {
        data?: Array<BillingPaymentMethod>;
    })>;
    /**
     * List recent invoices
     * @returns any Invoices fetched successfully
     * @throws ApiError
     */
    static getAccountBillingInvoices(): CancelablePromise<(StandardResponse & {
        data?: Array<BillingInvoice>;
    })>;
    /**
     * Create a billing portal session
     * @param requestBody
     * @returns any Billing portal session created
     * @throws ApiError
     */
    static postAccountBillingPortalSessions(requestBody?: BillingPortalSessionRequest): CancelablePromise<(StandardResponse & {
        data?: BillingPortalSession;
    })>;
}
//# sourceMappingURL=BillingService.d.ts.map