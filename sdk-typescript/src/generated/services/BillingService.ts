/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BillingInvoice } from '../models/BillingInvoice';
import type { BillingOverview } from '../models/BillingOverview';
import type { BillingPaymentMethod } from '../models/BillingPaymentMethod';
import type { BillingPortalSession } from '../models/BillingPortalSession';
import type { BillingPortalSessionRequest } from '../models/BillingPortalSessionRequest';
import type { StandardResponse } from '../models/StandardResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class BillingService {
    /**
     * Retrieve billing overview
     * @returns any Billing overview retrieved successfully
     * @throws ApiError
     */
    public static getAccountBillingOverview(): CancelablePromise<(StandardResponse & {
        data?: BillingOverview;
    })> {
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
    public static getAccountBillingPaymentMethods(): CancelablePromise<(StandardResponse & {
        data?: Array<BillingPaymentMethod>;
    })> {
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
    public static getAccountBillingInvoices(): CancelablePromise<(StandardResponse & {
        data?: Array<BillingInvoice>;
    })> {
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
    public static postAccountBillingPortalSessions(
        requestBody?: BillingPortalSessionRequest,
    ): CancelablePromise<(StandardResponse & {
        data?: BillingPortalSession;
    })> {
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
