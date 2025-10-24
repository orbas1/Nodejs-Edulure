/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EnvironmentParityManifestEntry } from './EnvironmentParityManifestEntry';
export type EnvironmentParityMismatch = {
    component: string;
    status: 'missing' | 'drifted' | 'relocated' | 'unexpected';
    expected?: EnvironmentParityManifestEntry | null;
    observed?: EnvironmentParityManifestEntry | null;
};

