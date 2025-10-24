import type { SecurityRiskRecord } from './SecurityRiskRecord';
import type { SecurityRiskSummary } from './SecurityRiskSummary';
export type SecurityRiskListResponse = {
    items: Array<SecurityRiskRecord>;
    pagination: {
        total?: number;
        limit?: number;
        offset?: number;
    };
    summary: SecurityRiskSummary;
};
//# sourceMappingURL=SecurityRiskListResponse.d.ts.map