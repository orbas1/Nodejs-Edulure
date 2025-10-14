/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FeatureFlagVariant } from './FeatureFlagVariant';
/**
 * Full feature flag definition used to evaluate capability access.
 */
export type FeatureFlagDefinition = {
    key: string;
    name?: string | null;
    description?: string | null;
    /**
     * Environments where the flag is allowed to run.
     */
    environments?: Array<string> | null;
    /**
     * Strategy controlling exposure such as percentage or schedule.
     */
    rolloutStrategy?: string | null;
    /**
     * Percentage of traffic eligible when using percentage-based rollouts.
     */
    rolloutPercentage?: number | null;
    /**
     * Indicates whether the kill switch is forcing the flag off.
     */
    killSwitch?: boolean | null;
    /**
     * Set of variants available for multivariate rollouts.
     */
    variants?: Array<FeatureFlagVariant> | null;
    /**
     * Segment targeting rules evaluated during rollout.
     */
    segmentRules?: Record<string, any> | null;
};

