import type { DashboardLearner } from './DashboardLearner';
import type { DashboardProfile } from './DashboardProfile';
import type { DashboardRole } from './DashboardRole';
import type { DashboardSearchIndexItem } from './DashboardSearchIndexItem';
export type DashboardResponse = {
    profile: DashboardProfile;
    roles: Array<DashboardRole>;
    dashboards: {
        learner: DashboardLearner;
    };
    searchIndex: Array<DashboardSearchIndexItem>;
};
//# sourceMappingURL=DashboardResponse.d.ts.map