/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ExplorerHit } from './ExplorerHit';
import type { ExplorerMapMarker } from './ExplorerMapMarker';
export type ExplorerEntityResult = {
    entity: 'communities' | 'courses' | 'ebooks' | 'tutors' | 'profiles' | 'ads' | 'events';
    totalHits: number;
    page: number;
    perPage: number;
    sort?: Array<string> | null;
    filter?: Array<string> | null;
    facets?: Record<string, Record<string, number>>;
    hits: Array<ExplorerHit>;
    processingTimeMs?: number;
    query?: string;
    markers?: Array<ExplorerMapMarker>;
};

