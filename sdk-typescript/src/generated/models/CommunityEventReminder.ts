/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type CommunityEventReminder = {
    id: number;
    eventId: number;
    userId: number;
    status: string;
    channel: string;
    remindAt: string;
    sentAt?: string | null;
    lastAttemptAt?: string | null;
    attemptCount: number;
    failureReason?: string | null;
    metadata: Record<string, any>;
};

