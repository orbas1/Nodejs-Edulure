import { AdsService } from '../generated/services/AdsService';
import { AnalyticsService } from '../generated/services/AnalyticsService';
import { CommunitiesService } from '../generated/services/CommunitiesService';
import { DefaultService } from '../generated/services/DefaultService';
import { ExplorerService } from '../generated/services/ExplorerService';
import { configureSdk } from './configure';
import { sdkManifest } from './manifest';
const registry = Object.freeze({
    ads: AdsService,
    analytics: AnalyticsService,
    communities: CommunitiesService,
    explorer: ExplorerService,
    core: DefaultService
});
export function createSdkClient(options) {
    const openApi = configureSdk(options);
    return Object.freeze({ ...registry, openApi, manifest: sdkManifest });
}
export function getService(key) {
    return registry[key];
}
export function listAvailableServices() {
    return Object.keys(registry);
}
//# sourceMappingURL=client.js.map