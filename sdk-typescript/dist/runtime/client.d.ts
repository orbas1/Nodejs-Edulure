import type { OpenAPIConfig } from '../generated/core/OpenAPI';
import { AdsService } from '../generated/services/AdsService';
import { AnalyticsService } from '../generated/services/AnalyticsService';
import { CommunitiesService } from '../generated/services/CommunitiesService';
import { DefaultService } from '../generated/services/DefaultService';
import { ExplorerService } from '../generated/services/ExplorerService';
import type { ConfigureSdkOptions } from './configure';
import type { SdkManifest } from './manifest';
export type ServiceRegistry = {
    ads: typeof AdsService;
    analytics: typeof AnalyticsService;
    communities: typeof CommunitiesService;
    explorer: typeof ExplorerService;
    core: typeof DefaultService;
};
export type SdkClient = ServiceRegistry & {
    readonly openApi: OpenAPIConfig;
    readonly manifest: SdkManifest;
};
export declare function createSdkClient(options: ConfigureSdkOptions): SdkClient;
export declare function getService<K extends keyof ServiceRegistry>(key: K): ServiceRegistry[K];
export declare function listAvailableServices(): Array<keyof ServiceRegistry>;
//# sourceMappingURL=client.d.ts.map