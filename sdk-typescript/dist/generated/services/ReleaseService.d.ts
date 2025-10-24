import type { ReleaseChecklistListResponse } from '../models/ReleaseChecklistListResponse';
import type { ReleaseDashboardResponse } from '../models/ReleaseDashboardResponse';
import type { ReleaseGateEvaluationResponse } from '../models/ReleaseGateEvaluationResponse';
import type { ReleaseRunCreateResponse } from '../models/ReleaseRunCreateResponse';
import type { ReleaseRunDetailResponse } from '../models/ReleaseRunDetailResponse';
import type { ReleaseRunEvaluationResponse } from '../models/ReleaseRunEvaluationResponse';
import type { ReleaseRunListResponse } from '../models/ReleaseRunListResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
export declare class ReleaseService {
    /**
     * List release readiness checklist items
     * @param category Filter by checklist category (comma separated).
     * @param limit Maximum number of items to return (1-200).
     * @param offset Offset into the result set.
     * @returns ReleaseChecklistListResponse Checklist items retrieved successfully.
     * @throws ApiError
     */
    static getReleaseChecklist(category?: string, limit?: number, offset?: number): CancelablePromise<ReleaseChecklistListResponse>;
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
    static getReleaseRuns(environment?: string, status?: string, versionTag?: string, limit?: number, offset?: number): CancelablePromise<ReleaseRunListResponse>;
    /**
     * Schedule a release run
     * @param requestBody
     * @returns ReleaseRunCreateResponse Release run scheduled.
     * @throws ApiError
     */
    static postReleaseRuns(requestBody: {
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
    }): CancelablePromise<ReleaseRunCreateResponse>;
    /**
     * Retrieve release run detail
     * @param publicId Release run identifier.
     * @returns ReleaseRunDetailResponse Release run detail retrieved.
     * @throws ApiError
     */
    static getReleaseRuns1(publicId: string): CancelablePromise<ReleaseRunDetailResponse>;
    /**
     * Record release gate evaluation
     * @param publicId Release run identifier.
     * @param gateKey Gate key from the release checklist.
     * @param requestBody
     * @returns ReleaseGateEvaluationResponse Gate evaluation recorded.
     * @throws ApiError
     */
    static postReleaseRunsGatesEvaluations(publicId: string, gateKey: string, requestBody: {
        status: string;
        ownerEmail?: string;
        metrics?: Record<string, any>;
        notes?: string;
        evidenceUrl?: string;
        lastEvaluatedAt?: string;
    }): CancelablePromise<ReleaseGateEvaluationResponse>;
    /**
     * Evaluate release readiness
     * @param publicId Release run identifier.
     * @returns ReleaseRunEvaluationResponse Readiness evaluation complete.
     * @throws ApiError
     */
    static postReleaseRunsEvaluate(publicId: string): CancelablePromise<ReleaseRunEvaluationResponse>;
    /**
     * Summarise release readiness dashboard data
     * @param environment Optional environment filter (e.g., production, staging).
     * @returns ReleaseDashboardResponse Release dashboard summary.
     * @throws ApiError
     */
    static getReleaseDashboard(environment?: string): CancelablePromise<ReleaseDashboardResponse>;
}
//# sourceMappingURL=ReleaseService.d.ts.map