/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
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

