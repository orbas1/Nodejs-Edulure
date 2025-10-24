import type { TelemetryConsentRecord } from '../models/TelemetryConsentRecord';
import type { TelemetryConsentRequest } from '../models/TelemetryConsentRequest';
import type { TelemetryEventIngestRequest } from '../models/TelemetryEventIngestRequest';
import type { TelemetryEventIngestResponse } from '../models/TelemetryEventIngestResponse';
import type { TelemetryExportSummary } from '../models/TelemetryExportSummary';
import type { TelemetryFreshnessMonitor } from '../models/TelemetryFreshnessMonitor';
import type { CancelablePromise } from '../core/CancelablePromise';
export declare class TelemetryService {
    /**
     * Ingest telemetry event
     * Registers a telemetry event for downstream export while enforcing consent and deduplication policies.
     * @param requestBody
     * @returns TelemetryEventIngestResponse Duplicate telemetry event acknowledged
     * @throws ApiError
     */
    static postTelemetryEvents(requestBody: TelemetryEventIngestRequest): CancelablePromise<TelemetryEventIngestResponse>;
    /**
     * Record telemetry consent decision
     * @param requestBody
     * @returns any Consent decision recorded
     * @throws ApiError
     */
    static postTelemetryConsents(requestBody: TelemetryConsentRequest): CancelablePromise<{
        consent: TelemetryConsentRecord;
    }>;
    /**
     * List telemetry freshness monitors
     * @param limit Maximum number of freshness monitors to return.
     * @returns any Telemetry freshness monitors retrieved
     * @throws ApiError
     */
    static getTelemetryFreshness(limit?: number): CancelablePromise<{
        monitors: Array<TelemetryFreshnessMonitor>;
    }>;
    /**
     * Trigger telemetry warehouse export
     * @returns TelemetryExportSummary No telemetry events pending export
     * @throws ApiError
     */
    static postTelemetryExport(): CancelablePromise<TelemetryExportSummary>;
}
//# sourceMappingURL=TelemetryService.d.ts.map