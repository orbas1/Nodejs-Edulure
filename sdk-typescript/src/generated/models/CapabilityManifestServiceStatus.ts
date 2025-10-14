/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CapabilityManifestComponentStatus } from './CapabilityManifestComponentStatus';
/**
 * Availability state for a core platform service.
 */
export type CapabilityManifestServiceStatus = {
    key: string;
    name: string;
    category: string;
    type: string;
    ready: boolean;
    /**
     * Overall service status derived from readiness checks.
     */
    status: 'operational' | 'degraded' | 'outage' | 'unknown';
    summary: string;
    checkedAt: string;
    components: Array<CapabilityManifestComponentStatus>;
    /**
     * Raw readiness payload returned by the probed service.
     */
    raw?: Record<string, any> | null;
};

