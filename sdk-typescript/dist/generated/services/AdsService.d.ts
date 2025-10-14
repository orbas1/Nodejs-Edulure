import type { AdsCampaign } from '../models/AdsCampaign';
import type { AdsInsightsResponse } from '../models/AdsInsightsResponse';
import type { CreateAdsCampaignRequest } from '../models/CreateAdsCampaignRequest';
import type { RecordAdsMetricsRequest } from '../models/RecordAdsMetricsRequest';
import type { StandardResponse } from '../models/StandardResponse';
import type { UpdateAdsCampaignRequest } from '../models/UpdateAdsCampaignRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
export declare class AdsService {
    /**
     * List campaigns for the authenticated instructor
     * @param status Optional comma separated list of campaign statuses
     * @param search
     * @param page
     * @param limit
     * @returns any Campaign list retrieved
     * @throws ApiError
     */
    static getAdsCampaigns(status?: string, search?: string, page?: number, limit?: number): CancelablePromise<(StandardResponse & {
        data?: Array<AdsCampaign>;
        meta?: {
            pagination?: {
                page?: number;
                limit?: number;
                total?: number;
                totalPages?: number;
            };
        };
    })>;
    /**
     * Create a new ad campaign
     * @param requestBody
     * @returns any Campaign created
     * @throws ApiError
     */
    static postAdsCampaigns(requestBody: CreateAdsCampaignRequest): CancelablePromise<(StandardResponse & {
        data?: AdsCampaign;
    })>;
    /**
     * Get campaign detail
     * @param campaignId
     * @returns any Campaign fetched
     * @throws ApiError
     */
    static getAdsCampaigns1(campaignId: string): CancelablePromise<(StandardResponse & {
        data?: AdsCampaign;
    })>;
    /**
     * Update an ad campaign
     * @param campaignId
     * @param requestBody
     * @returns any Campaign updated
     * @throws ApiError
     */
    static putAdsCampaigns(campaignId: string, requestBody: UpdateAdsCampaignRequest): CancelablePromise<(StandardResponse & {
        data?: AdsCampaign;
    })>;
    /**
     * Pause a campaign
     * @param campaignId
     * @returns any Campaign paused
     * @throws ApiError
     */
    static postAdsCampaignsPause(campaignId: string): CancelablePromise<(StandardResponse & {
        data?: AdsCampaign;
    })>;
    /**
     * Resume a campaign
     * @param campaignId
     * @returns any Campaign resumed
     * @throws ApiError
     */
    static postAdsCampaignsResume(campaignId: string): CancelablePromise<(StandardResponse & {
        data?: AdsCampaign;
    })>;
    /**
     * Record daily metrics
     * @param campaignId
     * @param requestBody
     * @returns any Metrics recorded
     * @throws ApiError
     */
    static postAdsCampaignsMetrics(campaignId: string, requestBody: RecordAdsMetricsRequest): CancelablePromise<(StandardResponse & {
        data?: AdsCampaign;
    })>;
    /**
     * Fetch rolling performance insights
     * @param campaignId
     * @param windowDays
     * @returns any Insights generated
     * @throws ApiError
     */
    static getAdsCampaignsInsights(campaignId: string, windowDays?: number): CancelablePromise<(StandardResponse & {
        data?: AdsInsightsResponse;
    })>;
}
//# sourceMappingURL=AdsService.d.ts.map