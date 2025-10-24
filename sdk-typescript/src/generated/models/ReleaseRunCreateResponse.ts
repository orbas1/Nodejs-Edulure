/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ReleaseGateResult } from './ReleaseGateResult';
import type { ReleaseRun } from './ReleaseRun';
export type ReleaseRunCreateResponse = {
    success: boolean;
    data: {
        run: ReleaseRun;
        gates: Array<ReleaseGateResult>;
    };
};

