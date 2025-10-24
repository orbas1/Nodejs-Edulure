export type TelemetryConsentRecord = {
    id?: number;
    userId?: number;
    tenantId?: string;
    consentScope?: string;
    consentVersion?: string;
    status?: string;
    isActive?: boolean;
    recordedAt?: string;
    effectiveAt?: string;
    expiresAt?: string | null;
    metadata?: Record<string, any>;
    evidence?: Record<string, any>;
};
//# sourceMappingURL=TelemetryConsentRecord.d.ts.map