/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
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

