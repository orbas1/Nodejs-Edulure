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
}
//# sourceMappingURL=AnalyticsService.js.map