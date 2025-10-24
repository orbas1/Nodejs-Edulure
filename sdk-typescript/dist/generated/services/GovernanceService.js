import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class GovernanceService {
    /**
     * Governance overview
     * @returns GovernanceOverviewResponse Governance overview retrieved.
     * @throws ApiError
     */
    static getGovernanceOverview() {
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
    static getGovernanceContracts(status, vendorName, riskTier, ownerEmail, renewalWithinDays, overdue, limit = 25, offset) {
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
    static patchGovernanceContracts(contractId, requestBody) {
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
    static getGovernanceVendorAssessments(vendorName, assessmentType, riskLevel, status, nextReviewBefore, overdue, limit = 25, offset) {
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
    static postGovernanceVendorAssessmentsDecisions(assessmentId, requestBody) {
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
    static getGovernanceReviewCycles(status, cycleName, startAfter, endBefore, onlyUpcoming, overdue, limit = 25, offset) {
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
    static postGovernanceReviewCyclesActionItems(reviewId, requestBody) {
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
    static getGovernanceCommunications(status, audience, channel, scheduledBefore, ownerEmail, limit = 25, offset) {
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
    static postGovernanceCommunications(requestBody) {
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
    static postGovernanceCommunicationsMetrics(communicationId, requestBody) {
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
//# sourceMappingURL=GovernanceService.js.map