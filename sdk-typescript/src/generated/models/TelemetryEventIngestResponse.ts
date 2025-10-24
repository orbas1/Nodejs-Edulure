/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type TelemetryEventIngestResponse = {
    status: string;
    duplicate: boolean;
    suppressed: boolean;
    consentStatus: string;
    event: {
        eventUuid?: string;
        eventName?: string;
        eventSource?: string;
        consentScope?: string;
        consentStatus?: string;
        ingestionStatus?: string;
        occurredAt?: string;
        receivedAt?: string;
    };
};

