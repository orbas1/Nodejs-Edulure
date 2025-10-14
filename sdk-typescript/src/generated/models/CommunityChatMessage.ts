/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type CommunityChatMessage = {
    id: number;
    communityId: number;
    channelId: number;
    authorId: number;
    messageType: 'text' | 'system' | 'event' | 'file' | 'live';
    body: string;
    attachments: Array<Record<string, any>>;
    metadata: Record<string, any>;
    status: string;
    pinned: boolean;
    threadRootId?: number | null;
    replyToMessageId?: number | null;
    deliveredAt?: string | null;
    deletedAt?: string | null;
    createdAt: string;
    updatedAt: string;
    author: {
        id?: number;
        firstName?: string;
        lastName?: string | null;
        email?: string;
        role?: string;
    };
};

