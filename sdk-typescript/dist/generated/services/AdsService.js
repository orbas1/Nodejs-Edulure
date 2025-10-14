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
    static getAdsCampaigns(status, search, page, limit) {
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
    static postAdsCampaigns(requestBody) {
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
    static getAdsCampaigns1(campaignId) {
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
    static putAdsCampaigns(campaignId, requestBody) {
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
    static postAdsCampaignsPause(campaignId) {
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
    static postAdsCampaignsResume(campaignId) {
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
    static postAdsCampaignsMetrics(campaignId, requestBody) {
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
    static getAdsCampaignsInsights(campaignId, windowDays) {
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
//# sourceMappingURL=AdsService.js.map