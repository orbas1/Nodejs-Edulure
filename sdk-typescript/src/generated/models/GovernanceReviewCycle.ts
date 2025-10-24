/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type GovernanceReviewCycle = {
    publicId: string;
    cycleName: string;
    status: string;
    startDate: string;
    endDate?: string | null;
    nextMilestoneAt?: string | null;
    focusAreas: Array<string>;
    participants: Array<Record<string, any>>;
    actionItems: Array<{
        id: string;
        summary: string;
        owner: string;
        dueAt?: string | null;
        completedAt?: string | null;
        status: string;
        recordedAt?: string | null;
    }>;
    outcomeNotes?: string | null;
    readinessScore: number;
    openActionItems?: number | null;
    milestoneStatus?: string | null;
};

