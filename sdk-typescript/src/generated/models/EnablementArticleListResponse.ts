/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EnablementArticleSummary } from './EnablementArticleSummary';
export type EnablementArticleListResponse = {
    success: boolean;
    data: {
        total: number;
        limit: number;
        offset: number;
        items: Array<EnablementArticleSummary>;
    };
};

