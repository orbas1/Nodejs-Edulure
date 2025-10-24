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
export declare class SecurityOperationsService {
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
    static listSecurityRisks(tenantId?: string, limit?: number, offset?: number, status?: string, category?: string, ownerId?: number, tag?: string, severity?: string, includeClosed?: boolean, sortBy?: 'residualRisk' | 'inherentRisk' | 'updatedAt' | 'createdAt' | 'nextReviewAt' | 'status', sortDirection?: 'asc' | 'desc', search?: string): CancelablePromise<(StandardResponse & {
        data?: SecurityRiskListResponse;
    })>;
    /**
     * Create a risk register entry
     * @param requestBody
     * @returns any Risk entry created
     * @throws ApiError
     */
    static createSecurityRisk(requestBody: {
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
    }): CancelablePromise<(StandardResponse & {
        data?: SecurityRiskRecord;
    })>;
    /**
     * Update a risk status and residual profile
     * @param riskId Numeric identifier for the risk.
     * @param requestBody
     * @returns any Risk entry updated
     * @throws ApiError
     */
    static updateSecurityRiskStatus(riskId: number, requestBody: {
        status: string;
        residualSeverity?: string;
        residualLikelihood?: string;
        residualNotes?: string;
        mitigationPlan?: string;
        nextReviewAt?: string;
    }): CancelablePromise<(StandardResponse & {
        data?: SecurityRiskRecord;
    })>;
    /**
     * Record a risk review and update residual scoring
     * @param riskId Numeric identifier for the risk.
     * @param requestBody
     * @returns any Successful response
     * @throws ApiError
     */
    static recordSecurityRiskReview(riskId: number, requestBody: {
        status?: string;
        residualSeverity?: string;
        residualLikelihood?: string;
        notes?: string;
        evidenceReferences?: Array<string>;
        reviewer?: SecurityRiskOwner;
        nextReviewAt?: string;
        reviewedAt?: string;
    }): CancelablePromise<(StandardResponse & {
        data?: {
            review?: SecurityRiskReviewRecord;
            risk?: SecurityRiskRecord;
        };
    })>;
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
    static listSecurityAuditEvidence(tenantId?: string, framework?: string, controlReference?: string, riskId?: number, status?: string, limit?: number, offset?: number): CancelablePromise<(StandardResponse & {
        data?: SecurityAuditEvidenceList;
    })>;
    /**
     * Record audit evidence metadata
     * @param requestBody
     * @returns any Evidence recorded
     * @throws ApiError
     */
    static recordSecurityAuditEvidence(requestBody: {
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
    }): CancelablePromise<(StandardResponse & {
        data?: SecurityAuditEvidence;
    })>;
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
    static listSecurityContinuityExercises(tenantId?: string, outcome?: string, ownerId?: number, since?: string, limit?: number, offset?: number): CancelablePromise<(StandardResponse & {
        data?: SecurityContinuityResponse;
    })>;
    /**
     * Log a business continuity exercise
     * @param requestBody
     * @returns any Continuity exercise recorded
     * @throws ApiError
     */
    static logSecurityContinuityExercise(requestBody: {
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
    }): CancelablePromise<(StandardResponse & {
        data?: SecurityContinuityExercise;
    })>;
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
    static listSecurityAssessments(tenantId?: string, status?: string, assessmentType?: string, scheduledFrom?: string, scheduledTo?: string, limit?: number, offset?: number): CancelablePromise<(StandardResponse & {
        data?: SecurityAssessmentList;
    })>;
    /**
     * Schedule a security assessment
     * @param requestBody
     * @returns any Assessment scheduled
     * @throws ApiError
     */
    static scheduleSecurityAssessment(requestBody: {
        assessmentType: string;
        scheduledFor: string;
        status?: string;
        owner?: SecurityRiskOwner;
        scope?: string;
        methodology?: string;
        metadata?: Record<string, any>;
    }): CancelablePromise<(StandardResponse & {
        data?: SecurityAssessment;
    })>;
}
//# sourceMappingURL=SecurityOperationsService.d.ts.map