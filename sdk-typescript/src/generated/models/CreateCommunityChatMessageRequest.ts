/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type CreateCommunityChatMessageRequest = {
    messageType?: 'text' | 'system' | 'event' | 'file' | 'live';
    body: string;
    attachments?: Array<Record<string, any>>;
    metadata?: Record<string, any>;
    replyToMessageId?: number;
    threadRootId?: number;
};

