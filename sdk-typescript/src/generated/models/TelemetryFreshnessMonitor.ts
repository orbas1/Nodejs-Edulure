/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type TelemetryFreshnessMonitor = {
    pipelineKey?: string;
    status?: 'healthy' | 'warning' | 'critical' | 'noop';
    lagSeconds?: number;
    thresholdMinutes?: number;
    lastEventAt?: string | null;
    metadata?: Record<string, any>;
};

