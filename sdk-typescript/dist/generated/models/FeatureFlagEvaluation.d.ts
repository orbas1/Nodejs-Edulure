export type FeatureFlagEvaluation = {
    key: string;
    enabled: boolean;
    reason?: string;
    variant?: string | null;
    bucket?: number | null;
    strategy?: string | null;
    evaluatedAt: string;
};
//# sourceMappingURL=FeatureFlagEvaluation.d.ts.map