export type SavedExplorerSearchRequest = {
    name: string;
    query?: string;
    entityTypes?: Array<'communities' | 'courses' | 'ebooks' | 'tutors' | 'profiles' | 'ads' | 'events'>;
    filters?: Record<string, any>;
    globalFilters?: Record<string, any>;
    sort?: Record<string, any>;
    isPinned?: boolean;
};
//# sourceMappingURL=SavedExplorerSearchRequest.d.ts.map