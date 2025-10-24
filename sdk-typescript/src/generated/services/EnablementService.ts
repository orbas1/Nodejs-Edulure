/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EnablementArticleListResponse } from '../models/EnablementArticleListResponse';
import type { EnablementArticleResponse } from '../models/EnablementArticleResponse';
import type { EnablementCapabilityMatrixResponse } from '../models/EnablementCapabilityMatrixResponse';
import type { EnablementReindexResponse } from '../models/EnablementReindexResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class EnablementService {
    /**
     * List enablement articles
     * @param audience Filter by audience codes (comma separated or repeated).
     * @param product Filter by product identifiers (comma separated or repeated).
     * @param tag Filter by tag (comma separated or repeated).
     * @param q Full text search across title, summary, and body.
     * @param limit Maximum number of items to return (1-100).
     * @param offset Offset into the result set.
     * @returns EnablementArticleListResponse Enablement articles retrieved successfully.
     * @throws ApiError
     */
    public static getEnablementArticles(
        audience?: string,
        product?: string,
        tag?: string,
        q?: string,
        limit: number = 25,
        offset?: number,
    ): CancelablePromise<EnablementArticleListResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/enablement/articles',
            query: {
                'audience': audience,
                'product': product,
                'tag': tag,
                'q': q,
                'limit': limit,
                'offset': offset,
            },
            errors: {
                401: `Missing or invalid token`,
                403: `Enablement APIs disabled for this role`,
            },
        });
    }
    /**
     * Retrieve enablement article
     * @param slug Article slug identifier.
     * @param format Response format for content.
     * @returns EnablementArticleResponse Enablement article returned.
     * @throws ApiError
     */
    public static getEnablementArticles1(
        slug: string,
        format: 'markdown' | 'html' = 'markdown',
    ): CancelablePromise<EnablementArticleResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/enablement/articles/{slug}',
            path: {
                'slug': slug,
            },
            query: {
                'format': format,
            },
            errors: {
                401: `Missing or invalid token`,
                403: `Enablement APIs disabled for this role`,
                404: `Enablement article not found`,
            },
        });
    }
    /**
     * Fetch enablement capability matrix
     * @returns EnablementCapabilityMatrixResponse Capability matrix returned.
     * @throws ApiError
     */
    public static getEnablementCapabilityMatrix(): CancelablePromise<EnablementCapabilityMatrixResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/enablement/capability-matrix',
            errors: {
                401: `Missing or invalid token`,
                403: `Enablement APIs disabled for this role`,
            },
        });
    }
    /**
     * Force enablement index refresh
     * @returns EnablementReindexResponse Reindex triggered.
     * @throws ApiError
     */
    public static postEnablementReindex(): CancelablePromise<EnablementReindexResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/enablement/reindex',
            errors: {
                401: `Missing or invalid token`,
                403: `Enablement APIs disabled for this role`,
            },
        });
    }
}
