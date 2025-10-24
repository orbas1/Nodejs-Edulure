/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FeedTrendingTag } from './FeedTrendingTag';
export type FeedEngagement = {
    postsSampled: number;
    postsTotal: number;
    comments: number;
    reactions: number;
    uniqueCommunities: number;
    trendingTags: Array<FeedTrendingTag>;
    latestActivityAt?: string | null;
};

