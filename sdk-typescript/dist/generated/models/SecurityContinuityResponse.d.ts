import type { SecurityContinuityExercise } from './SecurityContinuityExercise';
import type { SecurityContinuitySummary } from './SecurityContinuitySummary';
export type SecurityContinuityResponse = {
    items?: Array<SecurityContinuityExercise>;
    pagination?: {
        total?: number;
        limit?: number;
        offset?: number;
    };
    summary?: SecurityContinuitySummary;
};
//# sourceMappingURL=SecurityContinuityResponse.d.ts.map