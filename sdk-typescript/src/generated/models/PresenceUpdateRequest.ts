/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type PresenceUpdateRequest = {
    status?: 'online' | 'away' | 'offline';
    client?: 'web' | 'mobile' | 'provider' | 'admin';
    ttlMinutes?: number;
    metadata?: Record<string, any>;
    connectedAt?: string;
};

