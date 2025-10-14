/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
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

