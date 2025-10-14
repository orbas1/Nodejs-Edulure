/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CommunityPointSummary } from './CommunityPointSummary';
import type { CommunityPointTransaction } from './CommunityPointTransaction';
import type { CommunityStreak } from './CommunityStreak';
export type CommunityEngagementProgress = {
    membership: {
        id: number;
        communityId: number;
        userId: number;
        role: string;
        status: string;
        joinedAt?: string | null;
        updatedAt?: string | null;
        leftAt?: string | null;
        metadata: Record<string, any>;
    };
    points: CommunityPointSummary;
    streak: CommunityStreak;
    transactions: Array<CommunityPointTransaction>;
};

