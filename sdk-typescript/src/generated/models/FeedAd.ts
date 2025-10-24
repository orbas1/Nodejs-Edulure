/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FeedAdMetrics } from './FeedAdMetrics';
import type { FeedAdTracking } from './FeedAdTracking';
export type FeedAd = {
    placementId: string;
    campaignId: string;
    context: string;
    slot: string;
    position?: number | null;
    headline?: string | null;
    description?: string | null;
    ctaUrl?: string | null;
    advertiser?: string | null;
    objective?: string | null;
    tags?: Array<string>;
    disclosure?: string | null;
    metrics?: FeedAdMetrics | null;
    tracking?: FeedAdTracking | null;
    targeting?: Record<string, any> | null;
};

