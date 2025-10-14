export type CommunityChannelMembership = {
    id: number;
    channelId: number;
    userId: number;
    role: string;
    notificationsEnabled: boolean;
    muteUntil?: string | null;
    lastReadAt?: string | null;
    lastReadMessageId?: number | null;
    metadata: Record<string, any>;
    createdAt: string;
    updatedAt: string;
};
//# sourceMappingURL=CommunityChannelMembership.d.ts.map