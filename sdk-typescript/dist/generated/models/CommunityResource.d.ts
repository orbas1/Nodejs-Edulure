export type CommunityResource = {
    id: number;
    communityId: number;
    title: string;
    description?: string | null;
    resourceType: string;
    assetId?: number | null;
    asset?: {
        publicId?: string;
        filename?: string;
    } | null;
    linkUrl?: string | null;
    classroomReference?: string | null;
    tags: Array<string>;
    visibility: string;
    status: string;
    metadata: Record<string, any>;
    publishedAt?: string | null;
    createdAt: string;
    updatedAt: string;
    createdBy: {
        id: number;
        name: string;
        role?: string | null;
        avatarUrl: string;
    };
};
//# sourceMappingURL=CommunityResource.d.ts.map