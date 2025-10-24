/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SecurityAssessment } from '../models/SecurityAssessment';
import type { SecurityAssessmentList } from '../models/SecurityAssessmentList';
import type { SecurityAuditEvidence } from '../models/SecurityAuditEvidence';
import type { SecurityAuditEvidenceList } from '../models/SecurityAuditEvidenceList';
import type { SecurityContinuityExercise } from '../models/SecurityContinuityExercise';
import type { SecurityContinuityResponse } from '../models/SecurityContinuityResponse';
import type { SecurityRiskListResponse } from '../models/SecurityRiskListResponse';
import type { SecurityRiskOwner } from '../models/SecurityRiskOwner';
import type { SecurityRiskRecord } from '../models/SecurityRiskRecord';
import type { SecurityRiskReviewRecord } from '../models/SecurityRiskReviewRecord';
import type { StandardResponse } from '../models/StandardResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class SecurityOperationsService {
    /**
     * List risk register entries
     * @param tenantId Tenant scope override.
     * @param limit Maximum number of risks to return.
     * @param offset Offset for pagination.
     * @param status Filter by risk status.
     * @param category Filter by risk category.
     * @param ownerId Filter by risk owner id.
     * @param tag Filter by risk tag.
     * @param severity Filter by inherent severity.
     * @param includeClosed When false, hides closed/retired risks.
     * @param sortBy Sort column.
     * @param sortDirection Sort direction.
     * @param search Full-text search over titles and descriptions.
     * @returns any Successful response
     * @throws ApiError
     */
    public static listSecurityRisks(
        tenantId?: string,
        limit?: number,
        offset?: number,
        status?: string,
        category?: string,
        ownerId?: number,
        tag?: string,
        severity?: string,
        includeClosed?: boolean,
        sortBy?: 'residualRisk' | 'inherentRisk' | 'updatedAt' | 'createdAt' | 'nextReviewAt' | 'status',
        sortDirection?: 'asc' | 'desc',
        search?: string,
    ): CancelablePromise<(StandardResponse & {
        data?: SecurityRiskListResponse;
    })> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/security/risk-register',
            query: {
                'tenantId': tenantId,
                'limit': limit,
                'offset': offset,
                'status': status,
                'category': category,
                'ownerId': ownerId,
                'tag': tag,
                'severity': severity,
                'includeClosed': includeClosed,
                'sortBy': sortBy,
                'sortDirection': sortDirection,
                'search': search,
            },
        });
    }
    /**
     * Create a risk register entry
     * @param requestBody
     * @returns any Risk entry created
     * @throws ApiError
     */
    public static createSecurityRisk(
        requestBody: {
            title: string;
            description: string;
            category?: string;
            severity?: string;
            likelihood?: string;
            reviewCadenceDays?: number;
            mitigationPlan?: string;
            residualNotes?: string;
            regulatoryDriver?: string;
            detectionControls?: Array<string>;
            mitigationControls?: Array<string>;
            tags?: Array<string>;
            owner?: SecurityRiskOwner;
            metadata?: Record<string, any>;
        },
    ): CancelablePromise<(StandardResponse & {
        data?: SecurityRiskRecord;
    })> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/security/risk-register',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Update a risk status and residual profile
     * @param riskId Numeric identifier for the risk.
     * @param requestBody
     * @returns any Risk entry updated
     * @throws ApiError
     */
    public static updateSecurityRiskStatus(
        riskId: number,
        requestBody: {
            status: string;
            residualSeverity?: string;
            residualLikelihood?: string;
            residualNotes?: string;
            mitigationPlan?: string;
            nextReviewAt?: string;
        },
    ): CancelablePromise<(StandardResponse & {
        data?: SecurityRiskRecord;
    })> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/security/risk-register/{riskId}/status',
            path: {
                'riskId': riskId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Record a risk review and update residual scoring
     * @param riskId Numeric identifier for the risk.
     * @param requestBody
     * @returns any Successful response
     * @throws ApiError
     */
    public static recordSecurityRiskReview(
        riskId: number,
        requestBody: {
            status?: string;
            residualSeverity?: string;
            residualLikelihood?: string;
            notes?: string;
            evidenceReferences?: Array<string>;
            reviewer?: SecurityRiskOwner;
            nextReviewAt?: string;
            reviewedAt?: string;
        },
    ): CancelablePromise<(StandardResponse & {
        data?: {
            review?: SecurityRiskReviewRecord;
            risk?: SecurityRiskRecord;
        };
    })> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/security/risk-register/{riskId}/reviews',
            path: {
                'riskId': riskId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * List audit evidence records
     * @param tenantId Tenant scope override.
     * @param framework Filter by compliance framework.
     * @param controlReference Filter by control reference.
     * @param riskId Filter by risk id.
     * @param status Filter by evidence status.
     * @param limit Maximum number of evidence records.
     * @param offset Offset for pagination.
     * @returns any Successful response
     * @throws ApiError
     */
    public static listSecurityAuditEvidence(
        tenantId?: string,
        framework?: string,
        controlReference?: string,
        riskId?: number,
        status?: string,
        limit?: number,
        offset?: number,
    ): CancelablePromise<(StandardResponse & {
        data?: SecurityAuditEvidenceList;
    })> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/security/audit-evidence',
            query: {
                'tenantId': tenantId,
                'framework': framework,
                'controlReference': controlReference,
                'riskId': riskId,
                'status': status,
                'limit': limit,
                'offset': offset,
            },
        });
    }
    /**
     * Record audit evidence metadata
     * @param requestBody
     * @returns any Evidence recorded
     * @throws ApiError
     */
    public static recordSecurityAuditEvidence(
        requestBody: {
            riskId?: number;
            framework?: string;
            controlReference?: string;
            evidenceType?: string;
            storagePath: string;
            checksum?: string;
            sources?: Array<string>;
            capturedAt?: string;
            expiresAt?: string;
            status?: string;
            submittedBy?: number;
            submittedByEmail?: string;
            description?: string;
            metadata?: Record<string, any>;
        },
    ): CancelablePromise<(StandardResponse & {
        data?: SecurityAuditEvidence;
    })> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/security/audit-evidence',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * List business continuity exercises
     * @param tenantId Tenant scope override.
     * @param outcome Filter by exercise outcome.
     * @param ownerId Filter by owner id.
     * @param since Return exercises started after this timestamp.
     * @param limit Maximum number of exercises to return.
     * @param offset Offset for pagination.
     * @returns any Successful response
     * @throws ApiError
     */
    public static listSecurityContinuityExercises(
        tenantId?: string,
        outcome?: string,
        ownerId?: number,
        since?: string,
        limit?: number,
        offset?: number,
    ): CancelablePromise<(StandardResponse & {
        data?: SecurityContinuityResponse;
    })> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/security/continuity/exercises',
            query: {
                'tenantId': tenantId,
                'outcome': outcome,
                'ownerId': ownerId,
                'since': since,
                'limit': limit,
                'offset': offset,
            },
        });
    }
    /**
     * Log a business continuity exercise
     * @param requestBody
     * @returns any Continuity exercise recorded
     * @throws ApiError
     */
    public static logSecurityContinuityExercise(
        requestBody: {
            scenarioKey: string;
            scenarioSummary: string;
            exerciseType?: string;
            startedAt?: string;
            completedAt?: string;
            rtoTargetMinutes?: number;
            rpoTargetMinutes?: number;
            actualRtoMinutes?: number;
            actualRpoMinutes?: number;
            outcome?: string;
            lessonsLearned?: string;
            followUpActions?: Array<string>;
            owner?: SecurityRiskOwner;
            metadata?: Record<string, any>;
        },
    ): CancelablePromise<(StandardResponse & {
        data?: SecurityContinuityExercise;
    })> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/security/continuity/exercises',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * List security assessments
     * @param tenantId Tenant scope override.
     * @param status Filter by assessment status.
     * @param assessmentType Filter by assessment type.
     * @param scheduledFrom Assessments scheduled after this timestamp.
     * @param scheduledTo Assessments scheduled before this timestamp.
     * @param limit Maximum assessments to return.
     * @param offset Offset for pagination.
     * @returns any Successful response
     * @throws ApiError
     */
    public static listSecurityAssessments(
        tenantId?: string,
        status?: string,
        assessmentType?: string,
        scheduledFrom?: string,
        scheduledTo?: string,
        limit?: number,
        offset?: number,
    ): CancelablePromise<(StandardResponse & {
        data?: SecurityAssessmentList;
    })> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/security/assessments',
            query: {
                'tenantId': tenantId,
                'status': status,
                'assessmentType': assessmentType,
                'scheduledFrom': scheduledFrom,
                'scheduledTo': scheduledTo,
                'limit': limit,
                'offset': offset,
            },
        });
    }
    /**
     * Schedule a security assessment
     * @param requestBody
     * @returns any Assessment scheduled
     * @throws ApiError
     */
    public static scheduleSecurityAssessment(
        requestBody: {
            assessmentType: string;
            scheduledFor: string;
            status?: string;
            owner?: SecurityRiskOwner;
            scope?: string;
            methodology?: string;
            metadata?: Record<string, any>;
        },
    ): CancelablePromise<(StandardResponse & {
        data?: SecurityAssessment;
    })> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/security/assessments',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
