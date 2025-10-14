/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type PresenceSession = {
    id: number;
    userId: number;
    sessionId: string;
    client: 'web' | 'mobile' | 'provider' | 'admin';
    status: 'online' | 'away' | 'offline';
    connectedAt: string;
    lastSeenAt: string;
    expiresAt?: string | null;
    metadata: Record<string, any>;
};

