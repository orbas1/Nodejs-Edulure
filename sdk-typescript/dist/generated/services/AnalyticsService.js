import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AnalyticsService {
    /**
     * Retrieve explorer analytics summary
     * @param range Rolling time window (7d, 14d, or 30d)
     * @returns any Explorer analytics summary returned
     * @throws ApiError
     */
    static getAnalyticsExplorerSummary(range = '7d') {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/analytics/explorer/summary',
            query: {
                'range': range,
            },
            errors: {
                401: `Authentication required`,
                422: `Validation error`,
            },
        });
    }
    /**
     * List explorer analytics alerts
     * @param includeResolved
     * @returns any Explorer analytics alerts fetched
     * @throws ApiError
     */
    static getAnalyticsExplorerAlerts(includeResolved = false) {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/analytics/explorer/alerts',
            query: {
                'includeResolved': includeResolved,
            },
            errors: {
                401: `Authentication required`,
                422: `Validation error`,
            },
        });
    }
    /**
     * Record an explorer interaction event
     * @param requestBody
     * @returns any Interaction recorded
     * @throws ApiError
     */
    static postAnalyticsExplorerInteractions(requestBody) {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/analytics/explorer/interactions',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                404: `Search event not found`,
                422: `Validation error`,
            },
        });
    }
    /**
     * Executive analytics overview
     * Returns aggregated KPIs, trends, and telemetry health indicators for the executive dashboard.
     * @param range Time window used when calculating KPI deltas and trend lines.
     * @returns any Executive overview generated
     * @throws ApiError
     */
    static getAnalyticsBiExecutiveOverview(range = '30d') {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/analytics/bi/executive-overview',
            query: {
                'range': range,
            },
            errors: {
                401: `Missing or invalid token`,
                403: `Insufficient permissions`,
            },
        });
    }
}
//# sourceMappingURL=AnalyticsService.js.map