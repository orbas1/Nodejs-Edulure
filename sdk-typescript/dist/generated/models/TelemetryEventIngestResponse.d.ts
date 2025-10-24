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
//# sourceMappingURL=TelemetryEventIngestResponse.d.ts.map