/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type EnvironmentDependencyCheck = {
    /**
     * Name of the dependency that was evaluated.
     */
    component: string;
    status: 'healthy' | 'failed' | 'skipped';
    message?: string | null;
};

