/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EnvironmentDependencyCheck } from './EnvironmentDependencyCheck';
import type { EnvironmentParityManifest } from './EnvironmentParityManifest';
import type { EnvironmentParityMismatch } from './EnvironmentParityMismatch';
export type EnvironmentParityReport = {
    environment: {
        name: string;
        provider: string;
        region: string;
        tier: string;
        deploymentStrategy: string;
        parityBudgetMinutes: number;
        infrastructureOwner: string;
        gitSha?: string | null;
        releaseChannel: string;
        host: string;
        manifestVersion: number;
    };
    dependencies: Array<EnvironmentDependencyCheck>;
    manifest: {
        expected: EnvironmentParityManifest;
        observed: EnvironmentParityManifest;
    };
    mismatches: Array<EnvironmentParityMismatch>;
    status: 'healthy' | 'drifted' | 'degraded';
    generatedAt: string;
};

