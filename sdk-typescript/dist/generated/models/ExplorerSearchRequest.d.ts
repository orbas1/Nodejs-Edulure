export type ExplorerSearchRequest = {
    query?: string;
    entityTypes?: Array<'communities' | 'courses' | 'ebooks' | 'tutors' | 'profiles' | 'ads' | 'events'>;
    page?: number;
    perPage?: number;
    filters?: Record<string, any>;
    globalFilters?: Record<string, any>;
    sort?: Record<string, any>;
    includeFacets?: boolean;
    savedSearchId?: number;
};
//# sourceMappingURL=ExplorerSearchRequest.d.ts.map