/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FeedAdsSummary } from './FeedAdsSummary';
import type { FeedAnalytics } from './FeedAnalytics';
import type { FeedHighlight } from './FeedHighlight';
import type { FeedItem } from './FeedItem';
import type { FeedPagination } from './FeedPagination';
import type { FeedRange } from './FeedRange';
export type FeedSnapshot = {
    context: string;
    community?: string | null;
    range: FeedRange;
    generatedAt: string;
    pagination: FeedPagination;
    ads: FeedAdsSummary;
    items: Array<FeedItem>;
    highlights: Array<FeedHighlight>;
    analytics?: FeedAnalytics | null;
};

