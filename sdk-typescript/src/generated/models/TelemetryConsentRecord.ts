/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
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

