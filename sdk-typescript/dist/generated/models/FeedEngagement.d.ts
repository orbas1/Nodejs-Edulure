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
//# sourceMappingURL=FeedEngagement.d.ts.map