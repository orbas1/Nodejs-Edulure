/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Counts of services or capabilities by availability status.
 */
export type CapabilityManifestSummaryBreakdown = {
    operational: number;
    degraded: number;
    outage: number;
    unknown?: number | null;
    disabled?: number | null;
};

