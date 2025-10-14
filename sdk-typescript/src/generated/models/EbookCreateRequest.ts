/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type EbookCreateRequest = {
    assetId: string;
    title: string;
    subtitle?: string;
    description?: string;
    authors?: Array<string>;
    tags?: Array<string>;
    categories?: Array<string>;
    languages?: Array<string>;
    isbn?: string;
    readingTimeMinutes?: number;
    price: {
        currency: string;
        amount: number;
    };
    metadata?: Record<string, any>;
    status?: string;
    isPublic?: boolean;
    releaseAt?: string;
};

