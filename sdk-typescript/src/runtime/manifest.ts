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
};

const manifest: SdkManifest = manifestJson as SdkManifest;

export const sdkManifest: SdkManifest = Object.freeze({ ...manifest });

export function getSdkManifest(): SdkManifest {
  return sdkManifest;
}

export function describeSdk(): string {
  return `${sdkManifest.specTitle} v${sdkManifest.specVersion} (operations: ${sdkManifest.operationCount})`;
}

export function isManifestFresh(specHash: string | null | undefined): boolean {
  if (!specHash) {
    return false;
  }
  return specHash === sdkManifest.specHash;
}
