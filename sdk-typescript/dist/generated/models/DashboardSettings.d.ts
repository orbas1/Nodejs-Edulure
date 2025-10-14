import type { DashboardCommunitySetting } from './DashboardCommunitySetting';
import type { DashboardMessagingSettings } from './DashboardMessagingSettings';
import type { DashboardPrivacySettings } from './DashboardPrivacySettings';
export type DashboardSettings = {
    privacy: DashboardPrivacySettings;
    messaging: DashboardMessagingSettings;
    communities: Array<DashboardCommunitySetting>;
};
//# sourceMappingURL=DashboardSettings.d.ts.map