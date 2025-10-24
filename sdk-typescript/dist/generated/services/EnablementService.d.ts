import type { EnablementArticleListResponse } from '../models/EnablementArticleListResponse';
import type { EnablementArticleResponse } from '../models/EnablementArticleResponse';
import type { EnablementCapabilityMatrixResponse } from '../models/EnablementCapabilityMatrixResponse';
import type { EnablementReindexResponse } from '../models/EnablementReindexResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
export declare class EnablementService {
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
    static getEnablementArticles(audience?: string, product?: string, tag?: string, q?: string, limit?: number, offset?: number): CancelablePromise<EnablementArticleListResponse>;
    /**
     * Retrieve enablement article
     * @param slug Article slug identifier.
     * @param format Response format for content.
     * @returns EnablementArticleResponse Enablement article returned.
     * @throws ApiError
     */
    static getEnablementArticles1(slug: string, format?: 'markdown' | 'html'): CancelablePromise<EnablementArticleResponse>;
    /**
     * Fetch enablement capability matrix
     * @returns EnablementCapabilityMatrixResponse Capability matrix returned.
     * @throws ApiError
     */
    static getEnablementCapabilityMatrix(): CancelablePromise<EnablementCapabilityMatrixResponse>;
    /**
     * Force enablement index refresh
     * @returns EnablementReindexResponse Reindex triggered.
     * @throws ApiError
     */
    static postEnablementReindex(): CancelablePromise<EnablementReindexResponse>;
}
//# sourceMappingURL=EnablementService.d.ts.map