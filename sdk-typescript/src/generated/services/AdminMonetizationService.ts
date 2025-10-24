/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MonetizationCatalogItem } from '../models/MonetizationCatalogItem';
import type { MonetizationReconciliationRun } from '../models/MonetizationReconciliationRun';
import type { MonetizationRevenueSchedule } from '../models/MonetizationRevenueSchedule';
import type { MonetizationUsageRecord } from '../models/MonetizationUsageRecord';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AdminMonetizationService {
    /**
     * List monetization catalog items
     * @param tenantId Tenant scope for catalog lookup
     * @param status Optional status filter
     * @param limit Maximum number of records to return
     * @param offset Offset for pagination
     * @returns any Catalog items fetched
     * @throws ApiError
     */
    public static getAdminMonetizationCatalog(
        tenantId: string = 'global',
        status?: string,
        limit: number = 50,
        offset?: number,
    ): CancelablePromise<{
        success: boolean;
        message?: string | null;
        data: Array<MonetizationCatalogItem>;
        meta?: {
            tenantId?: string;
            pagination?: {
                limit?: number;
                offset?: number;
                count?: number;
            };
        };
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/admin/monetization/catalog',
            query: {
                'tenantId': tenantId,
                'status': status,
                'limit': limit,
                'offset': offset,
            },
        });
    }
    /**
     * Create or update a monetization catalog item
     * @param requestBody
     * @returns any Catalog item persisted
     * @throws ApiError
     */
    public static postAdminMonetizationCatalog(
        requestBody: {
            tenantId?: string;
            productCode: string;
            name: string;
            description?: string;
            pricingModel?: string;
            billingInterval?: string;
            revenueRecognitionMethod?: string;
            recognitionDurationDays?: number;
            unitAmountCents?: number;
            currency?: string;
            usageMetric?: string;
            revenueAccount?: string;
            deferredRevenueAccount?: string;
            metadata?: Record<string, any>;
            status?: string;
        },
    ): CancelablePromise<{
        success: boolean;
        message?: string;
        data: MonetizationCatalogItem;
        meta?: Record<string, any> | null;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/admin/monetization/catalog',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid payload`,
            },
        });
    }
    /**
     * Record monetization usage
     * @param requestBody
     * @returns any Usage recorded
     * @throws ApiError
     */
    public static postAdminMonetizationUsage(
        requestBody: {
            tenantId?: string;
            productCode: string;
            accountReference: string;
            userId?: number;
            quantity: number;
            unitAmountCents?: number;
            amountCents?: number;
            currency?: string;
            source?: string;
            usageDate?: string;
            externalReference?: string;
            metadata?: Record<string, any>;
        },
    ): CancelablePromise<{
        success: boolean;
        message?: string;
        data: MonetizationUsageRecord;
        meta?: Record<string, any> | null;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/admin/monetization/usage',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid payload`,
            },
        });
    }
    /**
     * List revenue schedules
     * @param tenantId
     * @param paymentIntentId
     * @param status
     * @param limit
     * @param offset
     * @returns any Revenue schedules fetched
     * @throws ApiError
     */
    public static getAdminMonetizationRevenueSchedules(
        tenantId: string = 'global',
        paymentIntentId?: number,
        status?: string,
        limit: number = 50,
        offset?: number,
    ): CancelablePromise<{
        success: boolean;
        message?: string | null;
        data: Array<MonetizationRevenueSchedule>;
        meta?: {
            tenantId?: string;
            pagination?: {
                limit?: number;
                offset?: number;
                count?: number;
            };
        };
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/admin/monetization/revenue-schedules',
            query: {
                'tenantId': tenantId,
                'paymentIntentId': paymentIntentId,
                'status': status,
                'limit': limit,
                'offset': offset,
            },
        });
    }
    /**
     * Trigger monetization reconciliation
     * @param requestBody
     * @returns any Reconciliation run accepted
     * @throws ApiError
     */
    public static postAdminMonetizationReconciliationsRun(
        requestBody?: {
            tenantId?: string;
            start?: string;
            end?: string;
        },
    ): CancelablePromise<{
        success: boolean;
        message?: string;
        data: MonetizationReconciliationRun;
        meta?: Record<string, any> | null;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/admin/monetization/reconciliations/run',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * List reconciliation runs
     * @param tenantId
     * @param limit
     * @returns any Reconciliation runs fetched
     * @throws ApiError
     */
    public static getAdminMonetizationReconciliations(
        tenantId: string = 'global',
        limit: number = 20,
    ): CancelablePromise<{
        success: boolean;
        message?: string | null;
        data: Array<MonetizationReconciliationRun>;
        meta?: {
            tenantId?: string;
        } | null;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/admin/monetization/reconciliations',
            query: {
                'tenantId': tenantId,
                'limit': limit,
            },
        });
    }
}
