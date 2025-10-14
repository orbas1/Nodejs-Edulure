/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type Community = {
    id: number;
    name: string;
    slug: string;
    description?: string | null;
    coverImageUrl?: string | null;
    visibility: 'public' | 'private';
    ownerId: number;
    metadata: Record<string, any>;
    stats: {
        members?: number;
        resources?: number;
        posts?: number;
        channels?: number;
        lastActivityAt?: string | null;
    };
    membership?: {
        role?: string;
        status?: string;
    } | null;
    createdAt: string;
    updatedAt: string;
};

