/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type CommunityPointTransaction = {
    id: number;
    communityId: number;
    userId: number;
    awardedBy?: number | null;
    deltaPoints: number;
    balanceAfter: number;
    reason: string;
    source: string;
    referenceId?: string | null;
    metadata: Record<string, any>;
    awardedAt: string;
};

