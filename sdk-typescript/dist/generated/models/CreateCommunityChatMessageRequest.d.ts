export type CreateCommunityChatMessageRequest = {
    messageType?: 'text' | 'system' | 'event' | 'file' | 'live';
    body: string;
    attachments?: Array<Record<string, any>>;
    metadata?: Record<string, any>;
    replyToMessageId?: number;
    threadRootId?: number;
};
//# sourceMappingURL=CreateCommunityChatMessageRequest.d.ts.map