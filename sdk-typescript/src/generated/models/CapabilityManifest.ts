/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CapabilityManifestCapability } from './CapabilityManifestCapability';
import type { CapabilityManifestServiceStatus } from './CapabilityManifestServiceStatus';
import type { CapabilityManifestSummary } from './CapabilityManifestSummary';
/**
 * Aggregated readiness report combining service health, capability exposure, and summary counts.
 */
export type CapabilityManifest = {
    environment: string;
    generatedAt: string;
    audience: string;
    services: Array<CapabilityManifestServiceStatus>;
    capabilities: Array<CapabilityManifestCapability>;
    summary: CapabilityManifestSummary;
};

