import type { AdsBudget } from './AdsBudget';
import type { AdsCreative } from './AdsCreative';
import type { AdsSchedule } from './AdsSchedule';
import type { AdsTargeting } from './AdsTargeting';
export type UpdateAdsCampaignRequest = {
    name?: string;
    objective?: 'awareness' | 'traffic' | 'leads' | 'conversions';
    status?: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'archived';
    budget?: AdsBudget;
    targeting?: AdsTargeting;
    creative?: AdsCreative;
    schedule?: AdsSchedule;
    metadata?: Record<string, any>;
};
//# sourceMappingURL=UpdateAdsCampaignRequest.d.ts.map