/**
 * Weighted variant definition used when rolling out feature flags.
 */
export type FeatureFlagVariant = {
    /**
     * Variant key returned to clients when selected.
     */
    key: string;
    /**
     * Distribution weight applied during percentage or schedule rollouts.
     */
    weight?: number | null;
    /**
     * Optional JSON payload returned with the variant selection.
     */
    payload?: Record<string, any> | null;
};
//# sourceMappingURL=FeatureFlagVariant.d.ts.map