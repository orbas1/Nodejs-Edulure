export type CommunityChatChannel = {
    id: number;
    communityId: number;
    name: string;
    slug: string;
    channelType: string;
    description?: string | null;
    isDefault: boolean;
    metadata: Record<string, any>;
    createdAt: string;
    updatedAt: string;
};
//# sourceMappingURL=CommunityChatChannel.d.ts.map