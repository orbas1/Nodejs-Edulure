export type SavedExplorerSearch = {
    id: number;
    name: string;
    query?: string;
    entityTypes: Array<'communities' | 'courses' | 'ebooks' | 'tutors' | 'profiles' | 'ads' | 'events'>;
    filters: Record<string, any>;
    globalFilters: Record<string, any>;
    sortPreferences: Record<string, any>;
    isPinned: boolean;
    lastUsedAt?: string | null;
    createdAt: string;
    updatedAt: string;
};
//# sourceMappingURL=SavedExplorerSearch.d.ts.map