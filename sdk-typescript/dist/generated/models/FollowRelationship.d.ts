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
//# sourceMappingURL=FollowRelationship.d.ts.map