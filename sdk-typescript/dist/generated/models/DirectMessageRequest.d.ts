export type DirectMessageRequest = {
    messageType?: 'text' | 'system' | 'file';
    body: string;
    attachments?: Array<Record<string, any>>;
    metadata?: Record<string, any>;
};
//# sourceMappingURL=DirectMessageRequest.d.ts.map