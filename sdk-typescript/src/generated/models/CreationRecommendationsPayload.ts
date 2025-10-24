/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CreationRecommendation } from './CreationRecommendation';
import type { CreationRecommendationMeta } from './CreationRecommendationMeta';
import type { FeatureFlagEvaluation } from './FeatureFlagEvaluation';
export type CreationRecommendationsPayload = {
    recommendations: Array<CreationRecommendation>;
    evaluation: FeatureFlagEvaluation;
    meta: CreationRecommendationMeta;
};

