import type { ObservabilitySloAnnotation } from './ObservabilitySloAnnotation';
import type { ObservabilitySloDefinition } from './ObservabilitySloDefinition';
import type { ObservabilitySloLatencySummary } from './ObservabilitySloLatencySummary';
export type ObservabilitySloSnapshot = {
    id: string;
    name: string;
    description: string;
    targetAvailability: number;
    windowMinutes: number;
    status: 'healthy' | 'warning' | 'critical' | 'breaching' | 'insufficient_data' | 'no_data';
    measuredAvailability?: number | null;
    successCount: number;
    errorCount: number;
    totalRequests: number;
    errorBudget?: number | null;
    errorBudgetRemaining?: number | null;
    burnRate: number;
    latency?: ObservabilitySloLatencySummary | null;
    windowStart: string;
    windowEnd: string;
    updatedAt?: string | null;
    observedMinutes: number;
    tags: Array<string>;
    annotations: Array<ObservabilitySloAnnotation>;
    definition?: ObservabilitySloDefinition | null;
};
//# sourceMappingURL=ObservabilitySloSnapshot.d.ts.map