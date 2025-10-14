/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Individual component readiness reported by a service probe.
 */
export type CapabilityManifestComponentStatus = {
    name: string;
    /**
     * Component level availability state such as ready or degraded.
     */
    status: string;
    ready: boolean;
    message?: string | null;
    updatedAt?: string | null;
};

