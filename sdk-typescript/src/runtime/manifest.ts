import manifestJson from '../generated/.manifest.json';

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

const manifest: SdkManifest = manifestJson as SdkManifest;

export const sdkManifest: SdkManifest = Object.freeze({ ...manifest });

export function getSdkManifest(): SdkManifest {
  return sdkManifest;
}

export function describeSdk(): string {
  const servicesSummary = sdkManifest.serviceCount
    ? `, services: ${sdkManifest.serviceCount}`
    : '';
  return `${sdkManifest.specTitle} v${sdkManifest.specVersion} (operations: ${sdkManifest.operationCount}${servicesSummary})`;
}

export function isManifestFresh(specHash: string | null | undefined): boolean {
  if (!specHash) {
    return false;
  }
  return specHash === sdkManifest.specHash;
}
