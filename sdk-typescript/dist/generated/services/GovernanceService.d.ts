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
export declare class GovernanceService {
    /**
     * Governance overview
     * @returns GovernanceOverviewResponse Governance overview retrieved.
     * @throws ApiError
     */
    static getGovernanceOverview(): CancelablePromise<GovernanceOverviewResponse>;
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
    static getGovernanceContracts(status?: string, vendorName?: string, riskTier?: string, ownerEmail?: string, renewalWithinDays?: number, overdue?: boolean, limit?: number, offset?: number): CancelablePromise<GovernanceContractListResponse>;
    /**
     * Update governance contract
     * @param contractId Public contract identifier.
     * @param requestBody
     * @returns GovernanceContract Contract updated.
     * @throws ApiError
     */
    static patchGovernanceContracts(contractId: string, requestBody: Record<string, any>): CancelablePromise<GovernanceContract>;
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
    static getGovernanceVendorAssessments(vendorName?: string, assessmentType?: string, riskLevel?: string, status?: string, nextReviewBefore?: string, overdue?: boolean, limit?: number, offset?: number): CancelablePromise<GovernanceVendorAssessmentListResponse>;
    /**
     * Record vendor assessment decision
     * @param assessmentId Vendor assessment identifier.
     * @param requestBody
     * @returns GovernanceVendorAssessment Assessment updated.
     * @throws ApiError
     */
    static postGovernanceVendorAssessmentsDecisions(assessmentId: string, requestBody: Record<string, any>): CancelablePromise<GovernanceVendorAssessment>;
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
    static getGovernanceReviewCycles(status?: string, cycleName?: string, startAfter?: string, endBefore?: string, onlyUpcoming?: boolean, overdue?: boolean, limit?: number, offset?: number): CancelablePromise<GovernanceReviewCycleListResponse>;
    /**
     * Record review cycle action
     * @param reviewId Review cycle identifier.
     * @param requestBody
     * @returns GovernanceReviewCycle Action item recorded.
     * @throws ApiError
     */
    static postGovernanceReviewCyclesActionItems(reviewId: string, requestBody: Record<string, any>): CancelablePromise<GovernanceReviewCycle>;
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
    static getGovernanceCommunications(status?: string, audience?: string, channel?: string, scheduledBefore?: string, ownerEmail?: string, limit?: number, offset?: number): CancelablePromise<GovernanceCommunicationListResponse>;
    /**
     * Schedule governance communication
     * @param requestBody
     * @returns GovernanceCommunication Communication scheduled.
     * @throws ApiError
     */
    static postGovernanceCommunications(requestBody: Record<string, any>): CancelablePromise<GovernanceCommunication>;
    /**
     * Record communication metrics
     * @param communicationId Communication identifier.
     * @param requestBody
     * @returns GovernanceCommunication Communication metrics recorded.
     * @throws ApiError
     */
    static postGovernanceCommunicationsMetrics(communicationId: string, requestBody: Record<string, any>): CancelablePromise<GovernanceCommunication>;
}
//# sourceMappingURL=GovernanceService.d.ts.map