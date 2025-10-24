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
import { configureSdk } from './configure';
import { sdkManifest } from './manifest';
const registry = Object.freeze({
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
export function createSdkClient(options) {
    const openApi = configureSdk(options);
    return Object.freeze({ ...registry, openApi, manifest: sdkManifest });
}
export function getService(key) {
    return registry[key];
}
export function listAvailableServices() {
    const manifestServices = Array.isArray(sdkManifest.services) ? sdkManifest.services : [];
    if (!manifestServices.length) {
        return Object.keys(registry);
    }
    const mapped = manifestServices
        .map((serviceName) => {
        if (serviceName in registry) {
            return serviceName;
        }
        const match = Object.entries(registry).find(([, service]) => service?.name === serviceName);
        return match ? match[0] : undefined;
    })
        .filter((value) => Boolean(value));
    return mapped.length ? mapped : Object.keys(registry);
}
//# sourceMappingURL=client.js.map