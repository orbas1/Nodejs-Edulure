export type PresenceUpdateRequest = {
    status?: 'online' | 'away' | 'offline';
    client?: 'web' | 'mobile' | 'provider' | 'admin';
    ttlMinutes?: number;
    metadata?: Record<string, any>;
    connectedAt?: string;
};
//# sourceMappingURL=PresenceUpdateRequest.d.ts.map