/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type TelemetryEventIngestRequest = {
    eventName: string;
    eventVersion?: string | null;
    eventSource: string;
    schemaVersion?: string;
    occurredAt?: string | null;
    receivedAt?: string | null;
    tenantId?: string | null;
    userId?: number | null;
    sessionId?: string | null;
    deviceId?: string | null;
    correlationId?: string | null;
    consentScope?: string | null;
    payload?: Record<string, any>;
    context?: Record<string, any>;
    metadata?: Record<string, any>;
    tags?: Array<string>;
};

