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
//# sourceMappingURL=PresenceSession.d.ts.map