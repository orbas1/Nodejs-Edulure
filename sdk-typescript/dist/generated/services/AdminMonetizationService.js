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
    static getAdminMonetizationCatalog(tenantId = 'global', status, limit = 50, offset) {
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
    static postAdminMonetizationCatalog(requestBody) {
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
    static postAdminMonetizationUsage(requestBody) {
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
    static getAdminMonetizationRevenueSchedules(tenantId = 'global', paymentIntentId, status, limit = 50, offset) {
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
    static postAdminMonetizationReconciliationsRun(requestBody) {
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
    static getAdminMonetizationReconciliations(tenantId = 'global', limit = 20) {
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
//# sourceMappingURL=AdminMonetizationService.js.map