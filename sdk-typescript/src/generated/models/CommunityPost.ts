/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CommunityChannel } from './CommunityChannel';
export type CommunityPost = {
    id: number;
    type: string;
    title?: string | null;
    body: string;
    publishedAt?: string | null;
    scheduledAt?: string | null;
    visibility: string;
    status: string;
    tags: Array<string>;
    channel?: CommunityChannel | null;
    community?: {
        id?: number;
        name?: string;
        slug?: string;
    } | null;
    author: {
        id: number;
        name: string;
        role?: string;
        avatarUrl: string;
    };
    stats: {
        reactions?: number;
        reactionBreakdown?: Record<string, number>;
        comments?: number;
    };
    metadata: Record<string, any>;
};

