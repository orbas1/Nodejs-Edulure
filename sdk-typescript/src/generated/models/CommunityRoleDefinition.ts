/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
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

