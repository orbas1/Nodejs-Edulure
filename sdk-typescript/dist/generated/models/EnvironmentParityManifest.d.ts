import type { EnvironmentParityManifestEntry } from './EnvironmentParityManifestEntry';
export type EnvironmentParityManifest = {
    modules: Record<string, EnvironmentParityManifestEntry>;
    environments: Record<string, EnvironmentParityManifestEntry>;
    docker: Record<string, EnvironmentParityManifestEntry>;
    scripts: Record<string, EnvironmentParityManifestEntry>;
    root: Record<string, EnvironmentParityManifestEntry>;
};
//# sourceMappingURL=EnvironmentParityManifest.d.ts.map