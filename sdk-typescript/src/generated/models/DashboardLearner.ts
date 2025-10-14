/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DashboardCalendarDay } from './DashboardCalendarDay';
import type { DashboardCommunityEngagementEntry } from './DashboardCommunityEngagementEntry';
import type { DashboardCommunitySummary } from './DashboardCommunitySummary';
import type { DashboardCourseSummary } from './DashboardCourseSummary';
import type { DashboardEbookEntry } from './DashboardEbookEntry';
import type { DashboardFinancialSummaryItem } from './DashboardFinancialSummaryItem';
import type { DashboardFollowerRecord } from './DashboardFollowerRecord';
import type { DashboardInvoice } from './DashboardInvoice';
import type { DashboardLearningPaceEntry } from './DashboardLearningPaceEntry';
import type { DashboardMetric } from './DashboardMetric';
import type { DashboardNotification } from './DashboardNotification';
import type { DashboardPipelineItem } from './DashboardPipelineItem';
import type { DashboardSettings } from './DashboardSettings';
import type { DashboardTutorBooking } from './DashboardTutorBooking';
import type { DashboardUpcomingItem } from './DashboardUpcomingItem';
export type DashboardLearner = {
    metrics: Array<DashboardMetric>;
    analytics: {
        learningPace: Array<DashboardLearningPaceEntry>;
        communityEngagement: Array<DashboardCommunityEngagementEntry>;
    };
    upcoming: Array<DashboardUpcomingItem>;
    communities: {
        managed: Array<DashboardCommunitySummary>;
        pipelines: Array<DashboardPipelineItem>;
    };
    courses: {
        active: Array<DashboardCourseSummary>;
        recommendations: Array<{
            id: string;
            title: string;
            summary?: string | null;
            rating?: string | null;
        }>;
    };
    calendar: Array<DashboardCalendarDay>;
    tutorBookings: {
        active: Array<DashboardTutorBooking>;
        history: Array<DashboardTutorBooking>;
    };
    ebooks: {
        library: Array<DashboardEbookEntry>;
        recommendations: Array<{
            id: string;
            title: string;
            summary?: string | null;
            rating?: string | null;
        }>;
    };
    financial: {
        summary: Array<DashboardFinancialSummaryItem>;
        invoices: Array<DashboardInvoice>;
    };
    notifications: {
        total: number;
        unreadMessages: number;
        items: Array<DashboardNotification>;
    };
    followers: {
        followers: number;
        following: number;
        pending: Array<DashboardFollowerRecord>;
        outgoing: Array<DashboardFollowerRecord>;
        recommendations: Array<DashboardFollowerRecord>;
    };
    settings: DashboardSettings;
};

