/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ObservabilitySloDetailResponse } from '../models/ObservabilitySloDetailResponse';
import type { ObservabilitySloListResponse } from '../models/ObservabilitySloListResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ObservabilityService {
    /**
     * Service level objectives
     * Returns the most recent error budget and latency snapshots for registered SLOs.
     * @param includeDefinition When true, include indicator and alert configuration with each snapshot.
     * @returns ObservabilitySloListResponse Current SLO snapshots.
     * @throws ApiError
     */
    public static getObservabilitySlos(
        includeDefinition: boolean = true,
    ): CancelablePromise<ObservabilitySloListResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/observability/slos',
            query: {
                'includeDefinition': includeDefinition,
            },
            errors: {
                401: `Missing or invalid token`,
                403: `Insufficient permissions`,
            },
        });
    }
    /**
     * Service level objective detail
     * Returns the current snapshot for a specific service level objective.
     * @param sloId Identifier of the service level objective to inspect.
     * @param includeDefinition When true, include indicator and alert configuration with the snapshot.
     * @returns ObservabilitySloDetailResponse SLO snapshot.
     * @throws ApiError
     */
    public static getObservabilitySlos1(
        sloId: string,
        includeDefinition: boolean = true,
    ): CancelablePromise<ObservabilitySloDetailResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/observability/slos/{sloId}',
            path: {
                'sloId': sloId,
            },
            query: {
                'includeDefinition': includeDefinition,
            },
            errors: {
                401: `Missing or invalid token`,
                403: `Insufficient permissions`,
                404: `SLO not found`,
            },
        });
    }
}
