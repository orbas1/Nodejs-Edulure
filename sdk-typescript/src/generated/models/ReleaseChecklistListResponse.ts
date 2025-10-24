/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ReleaseChecklistItem } from './ReleaseChecklistItem';
export type ReleaseChecklistListResponse = {
    success: boolean;
    data: {
        total: number;
        limit: number;
        offset: number;
        items: Array<ReleaseChecklistItem>;
        thresholds: {
            minCoverage?: number;
            maxTestFailureRate?: number;
            maxCriticalVulnerabilities?: number;
            maxHighVulnerabilities?: number;
            maxOpenIncidents?: number;
            maxErrorRate?: number;
        };
        requiredGates: Array<string>;
    };
};

