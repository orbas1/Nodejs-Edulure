export type DirectMessage = {
    id: number;
    threadId: number;
    senderId: number;
    messageType: 'text' | 'system' | 'file';
    body: string;
    attachments: Array<Record<string, any>>;
    metadata: Record<string, any>;
    status: string;
    deliveredAt?: string | null;
    readAt?: string | null;
    deletedAt?: string | null;
    createdAt: string;
    updatedAt: string;
    sender: {
        id?: number;
        firstName?: string;
        lastName?: string | null;
        email?: string;
        role?: string;
    };
};
//# sourceMappingURL=DirectMessage.d.ts.map