/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ExplorerEntityResult } from './ExplorerEntityResult';
import type { ExplorerMapMarker } from './ExplorerMapMarker';
export type ExplorerSearchResponse = {
    query?: string;
    page: number;
    perPage: number;
    entities: Array<'communities' | 'courses' | 'ebooks' | 'tutors' | 'profiles' | 'ads' | 'events'>;
    results: Record<string, ExplorerEntityResult>;
    totals: Record<string, number>;
    markers: {
        items: Array<ExplorerMapMarker>;
        bounds?: {
            minLat?: number;
            maxLat?: number;
            minLng?: number;
            maxLng?: number;
        } | null;
    };
    analytics?: {
        searchEventId?: string;
        totalResults?: number;
        totalDisplayed?: number;
        zeroResult?: boolean;
    } | null;
};

