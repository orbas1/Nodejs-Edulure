import type { FeatureFlagEvaluation } from './FeatureFlagEvaluation';
/**
 * Capability exposure information derived from feature flags and service dependencies.
 */
export type CapabilityManifestCapability = {
    name?: string | null;
    capability: string;
    description?: string | null;
    basePath?: string;
    flagKey: string;
    /**
     * Default rollout state applied when the flag definition is missing.
     */
    defaultState: 'enabled' | 'disabled';
    /**
     * Audience tier allowed to consume the capability.
     */
    audience?: string | null;
    enabled: boolean;
    /**
     * Availability derived from dependencies and flag evaluation.
     */
    status: 'operational' | 'degraded' | 'outage' | 'disabled';
    summary: string;
    dependencies: Array<string>;
    dependencyStatuses: Array<string>;
    accessible: boolean;
    /**
     * Numeric severity ranking to help clients order incidents.
     */
    severityRank: number;
    evaluation: FeatureFlagEvaluation;
    generatedAt: string;
};
//# sourceMappingURL=CapabilityManifestCapability.d.ts.map