import type { SocialUserSummary } from './SocialUserSummary';
export type FollowRecommendationItem = {
    recommendation?: {
        score: number;
        mutualFollowersCount: number;
        reasonCode: string;
        generatedAt?: string;
    };
    user?: SocialUserSummary;
};
//# sourceMappingURL=FollowRecommendationItem.d.ts.map