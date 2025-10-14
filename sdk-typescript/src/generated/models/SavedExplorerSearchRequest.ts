/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type SavedExplorerSearchRequest = {
    name: string;
    query?: string;
    entityTypes?: Array<'communities' | 'courses' | 'ebooks' | 'tutors' | 'profiles' | 'ads' | 'events'>;
    filters?: Record<string, any>;
    globalFilters?: Record<string, any>;
    sort?: Record<string, any>;
    isPinned?: boolean;
};

