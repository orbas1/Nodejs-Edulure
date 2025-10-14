/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type VerificationAuditEntry = {
    id?: number;
    action?: string;
    notes?: string | null;
    actor?: {
        id?: number;
        name?: string;
        email?: string;
    } | null;
    metadata?: Record<string, any>;
    createdAt?: string;
};

