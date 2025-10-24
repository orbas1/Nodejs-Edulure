import type { OpenAPIConfig } from '../generated/core/OpenAPI';
import { AdsService } from '../generated/services/AdsService';
import { AnalyticsService } from '../generated/services/AnalyticsService';
import { CommunitiesService } from '../generated/services/CommunitiesService';
import { DefaultService } from '../generated/services/DefaultService';
import { ExplorerService } from '../generated/services/ExplorerService';

import type { ConfigureSdkOptions } from './configure';
import { configureSdk } from './configure';
import type { SdkManifest } from './manifest';
import { sdkManifest } from './manifest';

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

const registry: ServiceRegistry = Object.freeze({
  ads: AdsService,
  analytics: AnalyticsService,
  communities: CommunitiesService,
  explorer: ExplorerService,
  core: DefaultService
});

export function createSdkClient(options: ConfigureSdkOptions): SdkClient {
  const openApi = configureSdk(options);
  return Object.freeze({ ...registry, openApi, manifest: sdkManifest });
}

export function getService<K extends keyof ServiceRegistry>(key: K): ServiceRegistry[K] {
  return registry[key];
}

export function listAvailableServices(): Array<keyof ServiceRegistry> {
  return Object.keys(registry) as Array<keyof ServiceRegistry>;
}
