import type { MonetizationCatalogItem } from '../models/MonetizationCatalogItem';
import type { MonetizationReconciliationRun } from '../models/MonetizationReconciliationRun';
import type { MonetizationRevenueSchedule } from '../models/MonetizationRevenueSchedule';
import type { MonetizationUsageRecord } from '../models/MonetizationUsageRecord';
import type { CancelablePromise } from '../core/CancelablePromise';
export declare class AdminMonetizationService {
    /**
     * List monetization catalog items
     * @param tenantId Tenant scope for catalog lookup
     * @param status Optional status filter
     * @param limit Maximum number of records to return
     * @param offset Offset for pagination
     * @returns any Catalog items fetched
     * @throws ApiError
     */
    static getAdminMonetizationCatalog(tenantId?: string, status?: string, limit?: number, offset?: number): CancelablePromise<{
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
    }>;
    /**
     * Create or update a monetization catalog item
     * @param requestBody
     * @returns any Catalog item persisted
     * @throws ApiError
     */
    static postAdminMonetizationCatalog(requestBody: {
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
    }): CancelablePromise<{
        success: boolean;
        message?: string;
        data: MonetizationCatalogItem;
        meta?: Record<string, any> | null;
    }>;
    /**
     * Record monetization usage
     * @param requestBody
     * @returns any Usage recorded
     * @throws ApiError
     */
    static postAdminMonetizationUsage(requestBody: {
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
    }): CancelablePromise<{
        success: boolean;
        message?: string;
        data: MonetizationUsageRecord;
        meta?: Record<string, any> | null;
    }>;
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
    static getAdminMonetizationRevenueSchedules(tenantId?: string, paymentIntentId?: number, status?: string, limit?: number, offset?: number): CancelablePromise<{
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
    }>;
    /**
     * Trigger monetization reconciliation
     * @param requestBody
     * @returns any Reconciliation run accepted
     * @throws ApiError
     */
    static postAdminMonetizationReconciliationsRun(requestBody?: {
        tenantId?: string;
        start?: string;
        end?: string;
    }): CancelablePromise<{
        success: boolean;
        message?: string;
        data: MonetizationReconciliationRun;
        meta?: Record<string, any> | null;
    }>;
    /**
     * List reconciliation runs
     * @param tenantId
     * @param limit
     * @returns any Reconciliation runs fetched
     * @throws ApiError
     */
    static getAdminMonetizationReconciliations(tenantId?: string, limit?: number): CancelablePromise<{
        success: boolean;
        message?: string | null;
        data: Array<MonetizationReconciliationRun>;
        meta?: {
            tenantId?: string;
        } | null;
    }>;
}
//# sourceMappingURL=AdminMonetizationService.d.ts.map