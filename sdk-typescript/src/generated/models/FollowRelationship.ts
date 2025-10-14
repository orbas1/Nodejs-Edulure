/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type FollowRelationship = {
    id?: number;
    followerId: number;
    followingId: number;
    status: 'pending' | 'accepted' | 'declined';
    source?: string | null;
    reason?: string | null;
    acceptedAt?: string | null;
    metadata?: Record<string, any>;
    createdAt?: string;
    updatedAt?: string;
};

