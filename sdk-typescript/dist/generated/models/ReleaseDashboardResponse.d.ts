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
//# sourceMappingURL=ReleaseDashboardResponse.d.ts.map