/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
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

