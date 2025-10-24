export type SdkManifest = {
    generatedAt: string;
    specHash: string;
    specTitle: string;
    specVersion: string;
    operationCount: number;
    generatorVersion: string;
    specPath: string;
    outputDir: string;
    services: string[];
    serviceCount: number;
    modelCount: number;
};
export declare const sdkManifest: SdkManifest;
export declare function getSdkManifest(): SdkManifest;
export declare function describeSdk(): string;
export declare function isManifestFresh(specHash: string | null | undefined): boolean;
//# sourceMappingURL=manifest.d.ts.map