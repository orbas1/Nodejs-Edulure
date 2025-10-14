export type CommunityEventParticipant = {
    id: number;
    eventId: number;
    userId: number;
    status: string;
    rsvpAt: string;
    checkInAt?: string | null;
    reminderScheduledAt?: string | null;
    metadata: Record<string, any>;
};
//# sourceMappingURL=CommunityEventParticipant.d.ts.map