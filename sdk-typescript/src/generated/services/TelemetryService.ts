/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TelemetryConsentRecord } from '../models/TelemetryConsentRecord';
import type { TelemetryConsentRequest } from '../models/TelemetryConsentRequest';
import type { TelemetryEventIngestRequest } from '../models/TelemetryEventIngestRequest';
import type { TelemetryEventIngestResponse } from '../models/TelemetryEventIngestResponse';
import type { TelemetryExportSummary } from '../models/TelemetryExportSummary';
import type { TelemetryFreshnessMonitor } from '../models/TelemetryFreshnessMonitor';
import type { CancelablePromise } from '../core/CancelablePromise';
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
    public static postTelemetryEvents(
        requestBody: TelemetryEventIngestRequest,
    ): CancelablePromise<TelemetryEventIngestResponse> {
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
    public static postTelemetryConsents(
        requestBody: TelemetryConsentRequest,
    ): CancelablePromise<{
        consent: TelemetryConsentRecord;
    }> {
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
    public static getTelemetryFreshness(
        limit: number = 50,
    ): CancelablePromise<{
        monitors: Array<TelemetryFreshnessMonitor>;
    }> {
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
    public static postTelemetryExport(): CancelablePromise<TelemetryExportSummary> {
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
