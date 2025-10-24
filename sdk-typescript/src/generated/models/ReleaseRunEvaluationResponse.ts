/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ReleaseGateWithSnapshot } from './ReleaseGateWithSnapshot';
import type { ReleaseRun } from './ReleaseRun';
export type ReleaseRunEvaluationResponse = {
    success: boolean;
    data: {
        run: ReleaseRun;
        readinessScore: number;
        blockingGates: Array<{
            gateKey: string;
            status: string;
            ownerEmail?: string | null;
            notes?: string | null;
        }>;
        gates: Array<ReleaseGateWithSnapshot>;
        requiredGates: Array<string>;
        recommendedStatus: 'ready' | 'in_progress' | 'blocked';
    };
};

