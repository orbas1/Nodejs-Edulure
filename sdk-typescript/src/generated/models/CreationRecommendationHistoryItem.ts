/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type CreationRecommendationHistoryItem = {
    id: number;
    generatedAt: string;
    algorithmVersion: string;
    tenantId: string;
    featureFlagState: string;
    featureFlagVariant?: string | null;
    recommendationCount: number;
    context?: Record<string, any>;
};

