export type CommunityRoleDefinition = {
    id: number;
    communityId: number;
    roleKey: string;
    name: string;
    description?: string | null;
    permissions: Record<string, any>;
    isDefaultAssignable: boolean;
    createdBy?: number | null;
    createdAt: string;
    updatedAt: string;
};
//# sourceMappingURL=CommunityRoleDefinition.d.ts.map