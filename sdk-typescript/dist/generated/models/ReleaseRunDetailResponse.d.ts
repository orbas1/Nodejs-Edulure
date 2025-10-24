import type { ReleaseGateWithSnapshot } from './ReleaseGateWithSnapshot';
import type { ReleaseRun } from './ReleaseRun';
export type ReleaseRunDetailResponse = {
    success: boolean;
    data: {
        run: ReleaseRun;
        gates: Array<ReleaseGateWithSnapshot>;
    };
};
//# sourceMappingURL=ReleaseRunDetailResponse.d.ts.map