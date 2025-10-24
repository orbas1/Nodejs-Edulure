/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ScorecardMetric } from './ScorecardMetric';
import type { TelemetryFreshnessMonitor } from './TelemetryFreshnessMonitor';
export type BiExecutiveOverview = {
    tenantId?: string;
    timeframe?: {
        range?: string;
        days?: number;
        start?: string;
        end?: string;
        comparisonStart?: string;
        comparisonEnd?: string;
    };
    scorecard?: {
        enrollments?: ScorecardMetric;
        completionRate?: ScorecardMetric;
        recognisedRevenue?: ScorecardMetric;
        netRevenue?: ScorecardMetric;
        averageProgressPercent?: ScorecardMetric;
        communityEngagement?: {
            posts?: ScorecardMetric;
            comments?: ScorecardMetric;
            events?: number;
        };
    };
    enrollmentTrends?: Array<{
        date?: string;
        enrollments?: number;
        completions?: number;
        recognisedRevenueCents?: number;
    }>;
    revenueTrends?: Array<{
        date?: string;
        currency?: string;
        grossVolumeCents?: number;
        recognisedVolumeCents?: number;
    }>;
    revenueByCurrency?: Array<{
        currency?: string;
        grossVolumeCents?: number;
        recognisedVolumeCents?: number;
        discountCents?: number;
        taxCents?: number;
        refundedCents?: number;
    }>;
    communityTrends?: Array<{
        date?: string;
        posts?: number;
        comments?: number;
    }>;
    topCommunities?: Array<{
        communityId?: number;
        name?: string;
        posts?: number;
        comments?: number;
    }>;
    categoryBreakdown?: Array<{
        category?: string;
        deliveryFormat?: string;
        level?: string;
        enrollments?: number;
        completions?: number;
        recognisedRevenueCents?: number;
    }>;
    experiments?: Array<{
        key?: string;
        experimentId?: string | null;
        name?: string;
        status?: string;
        rolloutPercentage?: number;
        owner?: string | null;
    }>;
    dataQuality?: {
        status?: string;
        pipelines?: Array<TelemetryFreshnessMonitor>;
    };
};

