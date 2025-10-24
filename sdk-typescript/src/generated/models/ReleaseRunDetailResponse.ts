/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ReleaseGateWithSnapshot } from './ReleaseGateWithSnapshot';
import type { ReleaseRun } from './ReleaseRun';
export type ReleaseRunDetailResponse = {
    success: boolean;
    data: {
        run: ReleaseRun;
        gates: Array<ReleaseGateWithSnapshot>;
    };
};

