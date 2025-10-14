import type { FeatureFlagDefinition } from './FeatureFlagDefinition';
/**
 * Result of evaluating a feature flag for a particular request context.
 */
export type FeatureFlagEvaluation = {
    key: string;
    enabled: boolean;
    /**
     * Reason describing why the capability is enabled or disabled.
     */
    reason: string;
    /**
     * Variant key selected for the user when enabled.
     */
    variant?: string | null;
    /**
     * Deterministic rollout bucket used when evaluating audience splits.
     */
    bucket?: number | null;
    /**
     * Rollout strategy applied during the evaluation.
     */
    strategy?: string | null;
    /**
     * Timestamp when the evaluation was performed.
     */
    evaluatedAt: string;
    /**
     * Snapshot of the flag definition used during evaluation when requested.
     */
    definition?: FeatureFlagDefinition | null;
};
//# sourceMappingURL=FeatureFlagEvaluation.d.ts.map