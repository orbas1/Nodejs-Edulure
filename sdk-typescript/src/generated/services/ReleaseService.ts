/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ReleaseChecklistListResponse } from '../models/ReleaseChecklistListResponse';
import type { ReleaseDashboardResponse } from '../models/ReleaseDashboardResponse';
import type { ReleaseGateEvaluationResponse } from '../models/ReleaseGateEvaluationResponse';
import type { ReleaseRunCreateResponse } from '../models/ReleaseRunCreateResponse';
import type { ReleaseRunDetailResponse } from '../models/ReleaseRunDetailResponse';
import type { ReleaseRunEvaluationResponse } from '../models/ReleaseRunEvaluationResponse';
import type { ReleaseRunListResponse } from '../models/ReleaseRunListResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ReleaseService {
    /**
     * List release readiness checklist items
     * @param category Filter by checklist category (comma separated).
     * @param limit Maximum number of items to return (1-200).
     * @param offset Offset into the result set.
     * @returns ReleaseChecklistListResponse Checklist items retrieved successfully.
     * @throws ApiError
     */
    public static getReleaseChecklist(
        category?: string,
        limit: number = 25,
        offset?: number,
    ): CancelablePromise<ReleaseChecklistListResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/release/checklist',
            query: {
                'category': category,
                'limit': limit,
                'offset': offset,
            },
            errors: {
                401: `Missing or invalid token`,
                403: `Release APIs disabled for this role`,
            },
        });
    }
    /**
     * List release runs
     * @param environment Filter by deployment environment (comma separated).
     * @param status Filter by release status (comma separated).
     * @param versionTag Filter by version tag prefix.
     * @param limit Maximum number of runs to return (1-200).
     * @param offset Offset into the result set.
     * @returns ReleaseRunListResponse Release runs retrieved successfully.
     * @throws ApiError
     */
    public static getReleaseRuns(
        environment?: string,
        status?: string,
        versionTag?: string,
        limit: number = 25,
        offset?: number,
    ): CancelablePromise<ReleaseRunListResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/release/runs',
            query: {
                'environment': environment,
                'status': status,
                'versionTag': versionTag,
                'limit': limit,
                'offset': offset,
            },
            errors: {
                401: `Missing or invalid token`,
                403: `Release APIs disabled for this role`,
            },
        });
    }
    /**
     * Schedule a release run
     * @param requestBody
     * @returns ReleaseRunCreateResponse Release run scheduled.
     * @throws ApiError
     */
    public static postReleaseRuns(
        requestBody: {
            versionTag: string;
            environment: string;
            initiatedByEmail: string;
            initiatedByName?: string;
            changeWindowStart?: string;
            changeWindowEnd?: string;
            summaryNotes?: string;
            metadata?: Record<string, any>;
            changeTicket?: string;
            scheduledAt?: string;
            initialGates?: Record<string, {
                status?: string;
                ownerEmail?: string;
                metrics?: Record<string, any>;
                notes?: string;
                evidenceUrl?: string;
                lastEvaluatedAt?: string;
            }>;
        },
    ): CancelablePromise<ReleaseRunCreateResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/release/runs',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid release payload`,
                401: `Missing or invalid token`,
                403: `Release APIs disabled for this role`,
            },
        });
    }
    /**
     * Retrieve release run detail
     * @param publicId Release run identifier.
     * @returns ReleaseRunDetailResponse Release run detail retrieved.
     * @throws ApiError
     */
    public static getReleaseRuns1(
        publicId: string,
    ): CancelablePromise<ReleaseRunDetailResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/release/runs/{publicId}',
            path: {
                'publicId': publicId,
            },
            errors: {
                401: `Missing or invalid token`,
                403: `Release APIs disabled for this role`,
                404: `Release run not found`,
            },
        });
    }
    /**
     * Record release gate evaluation
     * @param publicId Release run identifier.
     * @param gateKey Gate key from the release checklist.
     * @param requestBody
     * @returns ReleaseGateEvaluationResponse Gate evaluation recorded.
     * @throws ApiError
     */
    public static postReleaseRunsGatesEvaluations(
        publicId: string,
        gateKey: string,
        requestBody: {
            status: string;
            ownerEmail?: string;
            metrics?: Record<string, any>;
            notes?: string;
            evidenceUrl?: string;
            lastEvaluatedAt?: string;
        },
    ): CancelablePromise<ReleaseGateEvaluationResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/release/runs/{publicId}/gates/{gateKey}/evaluations',
            path: {
                'publicId': publicId,
                'gateKey': gateKey,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Missing or invalid token`,
                403: `Release APIs disabled for this role`,
                404: `Release run not found`,
            },
        });
    }
    /**
     * Evaluate release readiness
     * @param publicId Release run identifier.
     * @returns ReleaseRunEvaluationResponse Readiness evaluation complete.
     * @throws ApiError
     */
    public static postReleaseRunsEvaluate(
        publicId: string,
    ): CancelablePromise<ReleaseRunEvaluationResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/release/runs/{publicId}/evaluate',
            path: {
                'publicId': publicId,
            },
            errors: {
                401: `Missing or invalid token`,
                403: `Release APIs disabled for this role`,
                404: `Release run not found`,
            },
        });
    }
    /**
     * Summarise release readiness dashboard data
     * @param environment Optional environment filter (e.g., production, staging).
     * @returns ReleaseDashboardResponse Release dashboard summary.
     * @throws ApiError
     */
    public static getReleaseDashboard(
        environment?: string,
    ): CancelablePromise<ReleaseDashboardResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/release/dashboard',
            query: {
                'environment': environment,
            },
            errors: {
                401: `Missing or invalid token`,
                403: `Release APIs disabled for this role`,
            },
        });
    }
}
