/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
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

