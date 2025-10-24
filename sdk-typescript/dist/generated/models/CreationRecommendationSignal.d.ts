export type CreationRecommendationSignal = {
    /**
     * Signal identifier describing the heuristic that contributed to the score.
     */
    code: string;
    /**
     * Positive or negative weighting applied to the overall score.
     */
    weight: number;
    /**
     * Raw evidence captured for the signal.
     */
    detail?: Record<string, any>;
};
//# sourceMappingURL=CreationRecommendationSignal.d.ts.map