/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ContentAsset } from './ContentAsset';
export type ContentAnalytics = {
    asset: ContentAsset;
    events: Array<{
        eventType?: string;
        total?: number;
    }>;
    outputs?: Array<{
        format?: string;
        storageKey?: string;
        storageBucket?: string;
    }>;
    recentActivity?: Array<{
        eventType?: string;
        occurredAt?: string;
    }>;
    progressSummary?: {
        readers?: number;
        averageProgress?: number;
    } | null;
};

