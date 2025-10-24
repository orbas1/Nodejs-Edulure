/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ReleaseRun } from './ReleaseRun';
export type ReleaseDashboardResponse = {
    success: boolean;
    data: {
        breakdown: Record<string, number>;
        upcoming: Array<{
            publicId: string;
            versionTag: string;
            environment: string;
            status: string;
            changeWindowStart?: string | null;
            changeWindowEnd?: string | null;
            readinessScore?: number | null;
        }>;
        recent: Array<ReleaseRun>;
        requiredGates: Array<string>;
    };
};

