/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { GovernanceCommunication } from '../models/GovernanceCommunication';
import type { GovernanceCommunicationListResponse } from '../models/GovernanceCommunicationListResponse';
import type { GovernanceContract } from '../models/GovernanceContract';
import type { GovernanceContractListResponse } from '../models/GovernanceContractListResponse';
import type { GovernanceOverviewResponse } from '../models/GovernanceOverviewResponse';
import type { GovernanceReviewCycle } from '../models/GovernanceReviewCycle';
import type { GovernanceReviewCycleListResponse } from '../models/GovernanceReviewCycleListResponse';
import type { GovernanceVendorAssessment } from '../models/GovernanceVendorAssessment';
import type { GovernanceVendorAssessmentListResponse } from '../models/GovernanceVendorAssessmentListResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class GovernanceService {
    /**
     * Governance overview
     * @returns GovernanceOverviewResponse Governance overview retrieved.
     * @throws ApiError
     */
    public static getGovernanceOverview(): CancelablePromise<GovernanceOverviewResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/governance/overview',
            errors: {
                401: `Missing or invalid token`,
                403: `Governance APIs disabled for this role`,
            },
        });
    }
    /**
     * List governance contracts
     * @param status Filter by contract status (comma separated or repeated).
     * @param vendorName Filter by vendor name search term.
     * @param riskTier Filter by risk tier (comma separated or repeated).
     * @param ownerEmail Filter by contract owner email.
     * @param renewalWithinDays Return contracts with renewals within the provided day window.
     * @param overdue Return only overdue or escalated contracts when true.
     * @param limit Maximum number of contracts to return (1-100).
     * @param offset Offset into the contract result set.
     * @returns GovernanceContractListResponse Contracts retrieved.
     * @throws ApiError
     */
    public static getGovernanceContracts(
        status?: string,
        vendorName?: string,
        riskTier?: string,
        ownerEmail?: string,
        renewalWithinDays?: number,
        overdue?: boolean,
        limit: number = 25,
        offset?: number,
    ): CancelablePromise<GovernanceContractListResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/governance/contracts',
            query: {
                'status': status,
                'vendorName': vendorName,
                'riskTier': riskTier,
                'ownerEmail': ownerEmail,
                'renewalWithinDays': renewalWithinDays,
                'overdue': overdue,
                'limit': limit,
                'offset': offset,
            },
            errors: {
                401: `Missing or invalid token`,
                403: `Governance APIs disabled for this role`,
            },
        });
    }
    /**
     * Update governance contract
     * @param contractId Public contract identifier.
     * @param requestBody
     * @returns GovernanceContract Contract updated.
     * @throws ApiError
     */
    public static patchGovernanceContracts(
        contractId: string,
        requestBody: Record<string, any>,
    ): CancelablePromise<GovernanceContract> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/governance/contracts/{contractId}',
            path: {
                'contractId': contractId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Missing or invalid token`,
                403: `Governance APIs disabled for this role`,
                404: `Contract not found`,
            },
        });
    }
    /**
     * List vendor assessments
     * @param vendorName Filter by vendor name search term.
     * @param assessmentType Filter by assessment type (comma separated or repeated).
     * @param riskLevel Filter by risk level (comma separated or repeated).
     * @param status Filter by assessment status (comma separated or repeated).
     * @param nextReviewBefore Return assessments with next review before the provided date (YYYY-MM-DD).
     * @param overdue Only return overdue or remediation assessments when true.
     * @param limit Maximum number of assessments to return (1-100).
     * @param offset Offset into the assessment result set.
     * @returns GovernanceVendorAssessmentListResponse Assessments retrieved.
     * @throws ApiError
     */
    public static getGovernanceVendorAssessments(
        vendorName?: string,
        assessmentType?: string,
        riskLevel?: string,
        status?: string,
        nextReviewBefore?: string,
        overdue?: boolean,
        limit: number = 25,
        offset?: number,
    ): CancelablePromise<GovernanceVendorAssessmentListResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/governance/vendor-assessments',
            query: {
                'vendorName': vendorName,
                'assessmentType': assessmentType,
                'riskLevel': riskLevel,
                'status': status,
                'nextReviewBefore': nextReviewBefore,
                'overdue': overdue,
                'limit': limit,
                'offset': offset,
            },
            errors: {
                401: `Missing or invalid token`,
                403: `Governance APIs disabled for this role`,
            },
        });
    }
    /**
     * Record vendor assessment decision
     * @param assessmentId Vendor assessment identifier.
     * @param requestBody
     * @returns GovernanceVendorAssessment Assessment updated.
     * @throws ApiError
     */
    public static postGovernanceVendorAssessmentsDecisions(
        assessmentId: string,
        requestBody: Record<string, any>,
    ): CancelablePromise<GovernanceVendorAssessment> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/governance/vendor-assessments/{assessmentId}/decisions',
            path: {
                'assessmentId': assessmentId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Missing or invalid token`,
                403: `Governance APIs disabled for this role`,
                404: `Assessment not found`,
            },
        });
    }
    /**
     * List governance review cycles
     * @param status Filter by review cycle status (comma separated or repeated).
     * @param cycleName Filter by review cycle name search term.
     * @param startAfter Return cycles starting on or after the provided date (YYYY-MM-DD).
     * @param endBefore Return cycles ending on or before the provided date (YYYY-MM-DD).
     * @param onlyUpcoming Only include upcoming or in-progress cycles when true.
     * @param overdue Only include cycles with overdue milestones when true.
     * @param limit Maximum number of review cycles to return (1-100).
     * @param offset Offset into the review cycle result set.
     * @returns GovernanceReviewCycleListResponse Review cycles retrieved.
     * @throws ApiError
     */
    public static getGovernanceReviewCycles(
        status?: string,
        cycleName?: string,
        startAfter?: string,
        endBefore?: string,
        onlyUpcoming?: boolean,
        overdue?: boolean,
        limit: number = 25,
        offset?: number,
    ): CancelablePromise<GovernanceReviewCycleListResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/governance/review-cycles',
            query: {
                'status': status,
                'cycleName': cycleName,
                'startAfter': startAfter,
                'endBefore': endBefore,
                'onlyUpcoming': onlyUpcoming,
                'overdue': overdue,
                'limit': limit,
                'offset': offset,
            },
            errors: {
                401: `Missing or invalid token`,
                403: `Governance APIs disabled for this role`,
            },
        });
    }
    /**
     * Record review cycle action
     * @param reviewId Review cycle identifier.
     * @param requestBody
     * @returns GovernanceReviewCycle Action item recorded.
     * @throws ApiError
     */
    public static postGovernanceReviewCyclesActionItems(
        reviewId: string,
        requestBody: Record<string, any>,
    ): CancelablePromise<GovernanceReviewCycle> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/governance/review-cycles/{reviewId}/action-items',
            path: {
                'reviewId': reviewId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Missing or invalid token`,
                403: `Governance APIs disabled for this role`,
                404: `Review cycle not found`,
            },
        });
    }
    /**
     * List governance communications
     * @param status Filter by communication status (comma separated or repeated).
     * @param audience Filter by communication audience (comma separated or repeated).
     * @param channel Filter by communication channel (comma separated or repeated).
     * @param scheduledBefore Return communications scheduled before the provided date-time (ISO 8601).
     * @param ownerEmail Filter by owner email.
     * @param limit Maximum number of communications to return (1-100).
     * @param offset Offset into the communication result set.
     * @returns GovernanceCommunicationListResponse Communications retrieved.
     * @throws ApiError
     */
    public static getGovernanceCommunications(
        status?: string,
        audience?: string,
        channel?: string,
        scheduledBefore?: string,
        ownerEmail?: string,
        limit: number = 25,
        offset?: number,
    ): CancelablePromise<GovernanceCommunicationListResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/governance/communications',
            query: {
                'status': status,
                'audience': audience,
                'channel': channel,
                'scheduledBefore': scheduledBefore,
                'ownerEmail': ownerEmail,
                'limit': limit,
                'offset': offset,
            },
            errors: {
                401: `Missing or invalid token`,
                403: `Governance APIs disabled for this role`,
            },
        });
    }
    /**
     * Schedule governance communication
     * @param requestBody
     * @returns GovernanceCommunication Communication scheduled.
     * @throws ApiError
     */
    public static postGovernanceCommunications(
        requestBody: Record<string, any>,
    ): CancelablePromise<GovernanceCommunication> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/governance/communications',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid payload`,
                401: `Missing or invalid token`,
                403: `Governance APIs disabled for this role`,
            },
        });
    }
    /**
     * Record communication metrics
     * @param communicationId Communication identifier.
     * @param requestBody
     * @returns GovernanceCommunication Communication metrics recorded.
     * @throws ApiError
     */
    public static postGovernanceCommunicationsMetrics(
        communicationId: string,
        requestBody: Record<string, any>,
    ): CancelablePromise<GovernanceCommunication> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/governance/communications/{communicationId}/metrics',
            path: {
                'communicationId': communicationId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Missing or invalid token`,
                403: `Governance APIs disabled for this role`,
                404: `Communication not found`,
            },
        });
    }
}
