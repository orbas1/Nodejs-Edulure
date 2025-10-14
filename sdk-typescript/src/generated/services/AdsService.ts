/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AdsCampaign } from '../models/AdsCampaign';
import type { AdsInsightsResponse } from '../models/AdsInsightsResponse';
import type { CreateAdsCampaignRequest } from '../models/CreateAdsCampaignRequest';
import type { RecordAdsMetricsRequest } from '../models/RecordAdsMetricsRequest';
import type { StandardResponse } from '../models/StandardResponse';
import type { UpdateAdsCampaignRequest } from '../models/UpdateAdsCampaignRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AdsService {
    /**
     * List campaigns for the authenticated instructor
     * @param status Optional comma separated list of campaign statuses
     * @param search
     * @param page
     * @param limit
     * @returns any Campaign list retrieved
     * @throws ApiError
     */
    public static getAdsCampaigns(
        status?: string,
        search?: string,
        page?: number,
        limit?: number,
    ): CancelablePromise<(StandardResponse & {
        data?: Array<AdsCampaign>;
        meta?: {
            pagination?: {
                page?: number;
                limit?: number;
                total?: number;
                totalPages?: number;
            };
        };
    })> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/ads/campaigns',
            query: {
                'status': status,
                'search': search,
                'page': page,
                'limit': limit,
            },
        });
    }
    /**
     * Create a new ad campaign
     * @param requestBody
     * @returns any Campaign created
     * @throws ApiError
     */
    public static postAdsCampaigns(
        requestBody: CreateAdsCampaignRequest,
    ): CancelablePromise<(StandardResponse & {
        data?: AdsCampaign;
    })> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/ads/campaigns',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Get campaign detail
     * @param campaignId
     * @returns any Campaign fetched
     * @throws ApiError
     */
    public static getAdsCampaigns1(
        campaignId: string,
    ): CancelablePromise<(StandardResponse & {
        data?: AdsCampaign;
    })> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/ads/campaigns/{campaignId}',
            path: {
                'campaignId': campaignId,
            },
        });
    }
    /**
     * Update an ad campaign
     * @param campaignId
     * @param requestBody
     * @returns any Campaign updated
     * @throws ApiError
     */
    public static putAdsCampaigns(
        campaignId: string,
        requestBody: UpdateAdsCampaignRequest,
    ): CancelablePromise<(StandardResponse & {
        data?: AdsCampaign;
    })> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/ads/campaigns/{campaignId}',
            path: {
                'campaignId': campaignId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Pause a campaign
     * @param campaignId
     * @returns any Campaign paused
     * @throws ApiError
     */
    public static postAdsCampaignsPause(
        campaignId: string,
    ): CancelablePromise<(StandardResponse & {
        data?: AdsCampaign;
    })> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/ads/campaigns/{campaignId}/pause',
            path: {
                'campaignId': campaignId,
            },
        });
    }
    /**
     * Resume a campaign
     * @param campaignId
     * @returns any Campaign resumed
     * @throws ApiError
     */
    public static postAdsCampaignsResume(
        campaignId: string,
    ): CancelablePromise<(StandardResponse & {
        data?: AdsCampaign;
    })> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/ads/campaigns/{campaignId}/resume',
            path: {
                'campaignId': campaignId,
            },
        });
    }
    /**
     * Record daily metrics
     * @param campaignId
     * @param requestBody
     * @returns any Metrics recorded
     * @throws ApiError
     */
    public static postAdsCampaignsMetrics(
        campaignId: string,
        requestBody: RecordAdsMetricsRequest,
    ): CancelablePromise<(StandardResponse & {
        data?: AdsCampaign;
    })> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/ads/campaigns/{campaignId}/metrics',
            path: {
                'campaignId': campaignId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Fetch rolling performance insights
     * @param campaignId
     * @param windowDays
     * @returns any Insights generated
     * @throws ApiError
     */
    public static getAdsCampaignsInsights(
        campaignId: string,
        windowDays?: number,
    ): CancelablePromise<(StandardResponse & {
        data?: AdsInsightsResponse;
    })> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/ads/campaigns/{campaignId}/insights',
            path: {
                'campaignId': campaignId,
            },
            query: {
                'windowDays': windowDays,
            },
        });
    }
}
