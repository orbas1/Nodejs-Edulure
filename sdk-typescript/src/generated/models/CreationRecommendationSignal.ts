/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
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

