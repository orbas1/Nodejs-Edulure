/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
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

