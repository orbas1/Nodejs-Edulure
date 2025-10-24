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
//# sourceMappingURL=EnablementArticleListResponse.d.ts.map