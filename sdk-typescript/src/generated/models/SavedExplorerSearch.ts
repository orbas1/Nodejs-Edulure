/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
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

