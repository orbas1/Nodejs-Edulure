/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SecurityRiskOwner } from './SecurityRiskOwner';
export type SecurityContinuityExercise = {
    id?: number;
    exerciseUuid?: string;
    tenantId?: string;
    scenarioKey?: string;
    scenarioSummary?: string;
    exerciseType?: string;
    startedAt?: string;
    completedAt?: string | null;
    rtoTargetMinutes?: number | null;
    rpoTargetMinutes?: number | null;
    actualRtoMinutes?: number | null;
    actualRpoMinutes?: number | null;
    outcome?: string;
    lessonsLearned?: string | null;
    followUpActions?: Array<string>;
    owner?: SecurityRiskOwner;
    metadata?: Record<string, any>;
    createdAt?: string;
    updatedAt?: string;
};

