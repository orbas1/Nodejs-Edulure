/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
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

