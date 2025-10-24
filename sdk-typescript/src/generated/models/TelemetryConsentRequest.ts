/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
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

