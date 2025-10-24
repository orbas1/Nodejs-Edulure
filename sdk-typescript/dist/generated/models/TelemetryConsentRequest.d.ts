export type TelemetryConsentRequest = {
    consentScope: string;
    consentVersion?: string | null;
    status?: 'granted' | 'revoked' | 'expired';
    tenantId?: string | null;
    userId?: number | null;
    expiresAt?: string | null;
    metadata?: Record<string, any> | null;
    evidence?: Record<string, any> | null;
};
//# sourceMappingURL=TelemetryConsentRequest.d.ts.map