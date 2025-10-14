export type DashboardProfile = {
    id: number;
    name: string;
    email: string;
    avatar: string;
    title: string;
    bio: string;
    stats: Array<{
        label: string;
        value: string;
    }>;
    feedHighlights: Array<{
        id: number;
        headline: string;
        time: string;
        tags: Array<string>;
        reactions: number;
        comments: number;
    }>;
};
//# sourceMappingURL=DashboardProfile.d.ts.map