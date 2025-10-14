export type CommunityStreak = {
    communityId: number;
    userId: number;
    currentStreakDays: number;
    longestStreakDays: number;
    lastActiveOn?: string | null;
    resumedAt?: string | null;
    metadata: Record<string, any>;
};
//# sourceMappingURL=CommunityStreak.d.ts.map