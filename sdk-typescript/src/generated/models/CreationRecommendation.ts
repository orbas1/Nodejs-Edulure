/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CreationRecommendationAction } from './CreationRecommendationAction';
import type { CreationRecommendationSignal } from './CreationRecommendationSignal';
export type CreationRecommendation = {
    projectId?: number;
    /**
     * Stable identifier used across clients.
     */
    projectPublicId: string;
    projectTitle: string;
    projectType: 'course' | 'ebook' | 'community' | 'ads_asset';
    collaboratorCount?: number;
    priority: 'high' | 'medium' | 'low';
    action: CreationRecommendationAction;
    score: number;
    recommendedAt: string;
    signals: Array<CreationRecommendationSignal>;
};

