import type { ObservabilitySloAlerting } from './ObservabilitySloAlerting';
import type { ObservabilitySloIndicator } from './ObservabilitySloIndicator';
export type ObservabilitySloDefinition = {
    indicator: ObservabilitySloIndicator;
    alerting: ObservabilitySloAlerting;
    metadata?: Record<string, any> | null;
    tags: Array<string>;
};
//# sourceMappingURL=ObservabilitySloDefinition.d.ts.map