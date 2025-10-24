import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class TelemetryService {
    /**
     * Ingest telemetry event
     * Registers a telemetry event for downstream export while enforcing consent and deduplication policies.
     * @param requestBody
     * @returns TelemetryEventIngestResponse Duplicate telemetry event acknowledged
     * @throws ApiError
     */
    static postTelemetryEvents(requestBody) {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/telemetry/events',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                403: `Telemetry source not authorised`,
                422: `Invalid telemetry payload`,
                503: `Telemetry pipeline disabled`,
            },
        });
    }
    /**
     * Record telemetry consent decision
     * @param requestBody
     * @returns any Consent decision recorded
     * @throws ApiError
     */
    static postTelemetryConsents(requestBody) {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/telemetry/consents',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `User context missing`,
                422: `Invalid consent payload`,
            },
        });
    }
    /**
     * List telemetry freshness monitors
     * @param limit Maximum number of freshness monitors to return.
     * @returns any Telemetry freshness monitors retrieved
     * @throws ApiError
     */
    static getTelemetryFreshness(limit = 50) {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/telemetry/freshness',
            query: {
                'limit': limit,
            },
            errors: {
                401: `Missing or invalid token`,
            },
        });
    }
    /**
     * Trigger telemetry warehouse export
     * @returns TelemetryExportSummary No telemetry events pending export
     * @throws ApiError
     */
    static postTelemetryExport() {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/telemetry/export',
            errors: {
                401: `Missing or invalid token`,
                503: `Telemetry export disabled`,
            },
        });
    }
}
//# sourceMappingURL=TelemetryService.js.map