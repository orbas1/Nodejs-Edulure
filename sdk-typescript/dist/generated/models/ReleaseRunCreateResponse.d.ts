import type { ReleaseGateResult } from './ReleaseGateResult';
import type { ReleaseRun } from './ReleaseRun';
export type ReleaseRunCreateResponse = {
    success: boolean;
    data: {
        run: ReleaseRun;
        gates: Array<ReleaseGateResult>;
    };
};
//# sourceMappingURL=ReleaseRunCreateResponse.d.ts.map