export type DirectMessageParticipant = {
    id: number;
    threadId: number;
    userId: number;
    role: string;
    notificationsEnabled: boolean;
    isMuted: boolean;
    muteUntil?: string | null;
    lastReadAt?: string | null;
    lastReadMessageId?: number | null;
    metadata: Record<string, any>;
    createdAt: string;
    updatedAt: string;
};
//# sourceMappingURL=DirectMessageParticipant.d.ts.map