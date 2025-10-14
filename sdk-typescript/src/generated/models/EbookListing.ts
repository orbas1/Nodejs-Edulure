/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EbookAnalytics } from './EbookAnalytics';
import type { EbookPrice } from './EbookPrice';
import type { EbookRating } from './EbookRating';
export type EbookListing = {
    id: string;
    assetId: number;
    title: string;
    slug: string;
    subtitle?: string | null;
    description?: string | null;
    price: EbookPrice;
    readingTimeMinutes?: number | null;
    authors?: Array<string>;
    tags?: Array<string>;
    categories?: Array<string>;
    languages?: Array<string>;
    isbn?: string | null;
    status: string;
    isPublic: boolean;
    releaseAt?: string | null;
    metadata: Record<string, any>;
    analytics: EbookAnalytics;
    rating: EbookRating;
    createdAt?: string | null;
    updatedAt?: string | null;
};

