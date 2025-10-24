import type { EnvironmentParityManifestEntry } from './EnvironmentParityManifestEntry';
export type EnvironmentParityMismatch = {
    component: string;
    status: 'missing' | 'drifted' | 'relocated' | 'unexpected';
    expected?: EnvironmentParityManifestEntry | null;
    observed?: EnvironmentParityManifestEntry | null;
};
//# sourceMappingURL=EnvironmentParityMismatch.d.ts.map