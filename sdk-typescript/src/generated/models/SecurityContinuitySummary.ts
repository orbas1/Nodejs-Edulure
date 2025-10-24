/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SecurityContinuityExercise } from './SecurityContinuityExercise';
export type SecurityContinuitySummary = {
    totals?: {
        completed?: number;
        inProgress?: number;
        breachedTargets?: number;
    };
    latest?: SecurityContinuityExercise | null;
};

