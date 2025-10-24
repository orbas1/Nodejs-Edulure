import type { ReleaseRun } from './ReleaseRun';
export type ReleaseRunListResponse = {
    success: boolean;
    data: {
        total: number;
        limit: number;
        offset: number;
        items: Array<ReleaseRun>;
    };
};
//# sourceMappingURL=ReleaseRunListResponse.d.ts.map