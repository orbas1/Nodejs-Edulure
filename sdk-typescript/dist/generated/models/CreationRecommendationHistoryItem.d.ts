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
//# sourceMappingURL=CreationRecommendationHistoryItem.d.ts.map