/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
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

