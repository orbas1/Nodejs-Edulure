export type TelemetryFreshnessMonitor = {
    pipelineKey?: string;
    status?: 'healthy' | 'warning' | 'critical' | 'noop';
    lagSeconds?: number;
    thresholdMinutes?: number;
    lastEventAt?: string | null;
    metadata?: Record<string, any>;
};
//# sourceMappingURL=TelemetryFreshnessMonitor.d.ts.map