/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FeedAuthor } from './FeedAuthor';
import type { FeedCommunityRef } from './FeedCommunityRef';
import type { FeedPostStats } from './FeedPostStats';
export type FeedPost = {
    id?: number | null;
    type?: string | null;
    title?: string | null;
    body?: string | null;
    publishedAt?: string | null;
    scheduledAt?: string | null;
    visibility?: string | null;
    status?: string | null;
    tags?: Array<string>;
    channel?: Record<string, any> | null;
    community?: FeedCommunityRef | null;
    author?: FeedAuthor | null;
    stats?: FeedPostStats | null;
    metadata?: Record<string, any> | null;
};

