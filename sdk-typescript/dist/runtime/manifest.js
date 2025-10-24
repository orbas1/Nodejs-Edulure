import manifestJson from '../generated/.manifest.json';
const manifest = manifestJson;
export const sdkManifest = Object.freeze({ ...manifest });
export function getSdkManifest() {
    return sdkManifest;
}
export function describeSdk() {
    return `${sdkManifest.specTitle} v${sdkManifest.specVersion} (operations: ${sdkManifest.operationCount})`;
}
export function isManifestFresh(specHash) {
    if (!specHash) {
        return false;
    }
    return specHash === sdkManifest.specHash;
}
//# sourceMappingURL=manifest.js.map