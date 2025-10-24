/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ReleaseGateResult = {
    publicId: string;
    gateKey: string;
    status: 'pending' | 'in_progress' | 'pass' | 'fail' | 'waived';
    ownerEmail?: string | null;
    metrics: Record<string, any>;
    notes?: string | null;
    evidenceUrl?: string | null;
    lastEvaluatedAt?: string | null;
};

