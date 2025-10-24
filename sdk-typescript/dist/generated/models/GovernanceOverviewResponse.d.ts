import type { GovernanceContract } from './GovernanceContract';
export type GovernanceOverviewResponse = {
    success: boolean;
    data: {
        contracts: {
            summary?: Record<string, any>;
            upcomingRenewals?: Array<GovernanceContract>;
        };
        vendorAssessments: Record<string, any>;
        reviewCycles: Record<string, any>;
        communications: Record<string, any>;
    };
};
//# sourceMappingURL=GovernanceOverviewResponse.d.ts.map