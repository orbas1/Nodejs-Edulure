/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ExplorerAnalyticsAlert } from '../models/ExplorerAnalyticsAlert';
import type { ExplorerAnalyticsSummary } from '../models/ExplorerAnalyticsSummary';
import type { ExplorerInteractionRecord } from '../models/ExplorerInteractionRecord';
import type { ExplorerInteractionRequest } from '../models/ExplorerInteractionRequest';
import type { StandardResponse } from '../models/StandardResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AnalyticsService {
    /**
     * Retrieve explorer analytics summary
     * @param range Rolling time window (7d, 14d, or 30d)
     * @returns any Explorer analytics summary returned
     * @throws ApiError
     */
    public static getAnalyticsExplorerSummary(
        range: '7d' | '14d' | '30d' = '7d',
    ): CancelablePromise<(StandardResponse & {
        data?: ExplorerAnalyticsSummary;
    })> {
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
    public static getAnalyticsExplorerAlerts(
        includeResolved: boolean = false,
    ): CancelablePromise<(StandardResponse & {
        data?: Array<ExplorerAnalyticsAlert>;
    })> {
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
    public static postAnalyticsExplorerInteractions(
        requestBody: ExplorerInteractionRequest,
    ): CancelablePromise<(StandardResponse & {
        data?: ExplorerInteractionRecord;
    })> {
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
