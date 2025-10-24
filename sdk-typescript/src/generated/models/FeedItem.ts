/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FeedAd } from './FeedAd';
import type { FeedPost } from './FeedPost';
export type FeedItem = {
    kind: 'post' | 'ad';
    context: string;
    timestamp: string;
    post?: FeedPost | null;
    ad?: FeedAd | null;
};

