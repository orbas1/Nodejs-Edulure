export type EnvironmentDependencyCheck = {
    /**
     * Name of the dependency that was evaluated.
     */
    component: string;
    status: 'healthy' | 'failed' | 'skipped';
    message?: string | null;
};
//# sourceMappingURL=EnvironmentDependencyCheck.d.ts.map