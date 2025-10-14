/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DashboardCommunitySetting } from './DashboardCommunitySetting';
import type { DashboardMessagingSettings } from './DashboardMessagingSettings';
import type { DashboardPrivacySettings } from './DashboardPrivacySettings';
export type DashboardSettings = {
    privacy: DashboardPrivacySettings;
    messaging: DashboardMessagingSettings;
    communities: Array<DashboardCommunitySetting>;
};

