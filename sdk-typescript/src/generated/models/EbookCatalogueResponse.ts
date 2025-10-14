/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EbookCatalogueMetrics } from './EbookCatalogueMetrics';
import type { EbookListing } from './EbookListing';
import type { EbookRecentPurchase } from './EbookRecentPurchase';
export type EbookCatalogueResponse = {
    catalogue: Array<EbookListing>;
    metrics: EbookCatalogueMetrics;
    recentPurchases: Array<EbookRecentPurchase>;
};

