import type { OpenAPIConfig } from '../generated/core/OpenAPI';
import { AdminMonetizationService } from '../generated/services/AdminMonetizationService';
import { AdsService } from '../generated/services/AdsService';
import { AnalyticsService } from '../generated/services/AnalyticsService';
import { BillingService } from '../generated/services/BillingService';
import { CommunitiesService } from '../generated/services/CommunitiesService';
import { DefaultService } from '../generated/services/DefaultService';
import { EnablementService } from '../generated/services/EnablementService';
import { EnvironmentService } from '../generated/services/EnvironmentService';
import { ExplorerService } from '../generated/services/ExplorerService';
import { GovernanceService } from '../generated/services/GovernanceService';
import { ObservabilityService } from '../generated/services/ObservabilityService';
import { ReleaseService } from '../generated/services/ReleaseService';
import { SecurityOperationsService } from '../generated/services/SecurityOperationsService';
import { TelemetryService } from '../generated/services/TelemetryService';

import type { ConfigureSdkOptions } from './configure';
import { configureSdk } from './configure';
import type { SdkManifest } from './manifest';
import { sdkManifest } from './manifest';

export type ServiceRegistry = {
  adminMonetization: typeof AdminMonetizationService;
  ads: typeof AdsService;
  analytics: typeof AnalyticsService;
  billing: typeof BillingService;
  communities: typeof CommunitiesService;
  enablement: typeof EnablementService;
  environment: typeof EnvironmentService;
  explorer: typeof ExplorerService;
  governance: typeof GovernanceService;
  observability: typeof ObservabilityService;
  release: typeof ReleaseService;
  securityOperations: typeof SecurityOperationsService;
  telemetry: typeof TelemetryService;
  core: typeof DefaultService;
};

export type SdkClient = ServiceRegistry & {
  readonly openApi: OpenAPIConfig;
  readonly manifest: SdkManifest;
};

const registry: ServiceRegistry = Object.freeze({
  adminMonetization: AdminMonetizationService,
  ads: AdsService,
  analytics: AnalyticsService,
  billing: BillingService,
  communities: CommunitiesService,
  enablement: EnablementService,
  environment: EnvironmentService,
  explorer: ExplorerService,
  governance: GovernanceService,
  observability: ObservabilityService,
  release: ReleaseService,
  securityOperations: SecurityOperationsService,
  telemetry: TelemetryService,
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
  const manifestServices = Array.isArray(sdkManifest.services) ? sdkManifest.services : [];
  if (!manifestServices.length) {
    return Object.keys(registry) as Array<keyof ServiceRegistry>;
  }

  const mapped = manifestServices
    .map((serviceName) => {
      if (serviceName in registry) {
        return serviceName as keyof ServiceRegistry;
      }
      const match = Object.entries(registry).find(([, service]) => service?.name === serviceName);
      return match ? (match[0] as keyof ServiceRegistry) : undefined;
    })
    .filter((value): value is keyof ServiceRegistry => Boolean(value));

  return mapped.length ? mapped : (Object.keys(registry) as Array<keyof ServiceRegistry>);
}
