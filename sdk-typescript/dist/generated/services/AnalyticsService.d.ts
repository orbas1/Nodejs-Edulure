import type { BiExecutiveOverview } from '../models/BiExecutiveOverview';
import type { ExplorerAnalyticsAlert } from '../models/ExplorerAnalyticsAlert';
import type { ExplorerAnalyticsSummary } from '../models/ExplorerAnalyticsSummary';
import type { ExplorerInteractionRecord } from '../models/ExplorerInteractionRecord';
import type { ExplorerInteractionRequest } from '../models/ExplorerInteractionRequest';
import type { StandardResponse } from '../models/StandardResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
export declare class AnalyticsService {
    /**
     * Retrieve explorer analytics summary
     * @param range Rolling time window (7d, 14d, or 30d)
     * @returns any Explorer analytics summary returned
     * @throws ApiError
     */
    static getAnalyticsExplorerSummary(range?: '7d' | '14d' | '30d'): CancelablePromise<(StandardResponse & {
        data?: ExplorerAnalyticsSummary;
    })>;
    /**
     * List explorer analytics alerts
     * @param includeResolved
     * @returns any Explorer analytics alerts fetched
     * @throws ApiError
     */
    static getAnalyticsExplorerAlerts(includeResolved?: boolean): CancelablePromise<(StandardResponse & {
        data?: Array<ExplorerAnalyticsAlert>;
    })>;
    /**
     * Record an explorer interaction event
     * @param requestBody
     * @returns any Interaction recorded
     * @throws ApiError
     */
    static postAnalyticsExplorerInteractions(requestBody: ExplorerInteractionRequest): CancelablePromise<(StandardResponse & {
        data?: ExplorerInteractionRecord;
    })>;
    /**
     * Executive analytics overview
     * Returns aggregated KPIs, trends, and telemetry health indicators for the executive dashboard.
     * @param range Time window used when calculating KPI deltas and trend lines.
     * @returns any Executive overview generated
     * @throws ApiError
     */
    static getAnalyticsBiExecutiveOverview(range?: '7d' | '14d' | '30d' | '90d'): CancelablePromise<(StandardResponse & {
        data?: BiExecutiveOverview;
    })>;
}
//# sourceMappingURL=AnalyticsService.d.ts.map