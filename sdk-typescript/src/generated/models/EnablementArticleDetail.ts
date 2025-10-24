/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type EnablementArticleDetail = {
    slug: string;
    title: string;
    summary: string;
    content: string;
    format: 'markdown' | 'html';
    audience: Array<string>;
    products: Array<string>;
    tags: Array<string>;
    capabilities: Array<string>;
    owner: string;
    deliverables?: Array<string>;
    timeToCompleteMinutes?: number;
    readingTimeMinutes?: number;
    updatedAt?: string;
    createdAt?: string;
    wordCount?: number;
    contentHash?: string;
};

