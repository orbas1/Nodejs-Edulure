import type { AdsBudget } from './AdsBudget';
import type { AdsCreative } from './AdsCreative';
import type { AdsTargeting } from './AdsTargeting';
export type CreateAdsCampaignRequest = {
    name: string;
    objective: 'awareness' | 'traffic' | 'leads' | 'conversions';
    status?: 'draft' | 'scheduled' | 'active' | 'paused';
    budget: AdsBudget;
    targeting?: AdsTargeting;
    creative: AdsCreative;
    metadata?: Record<string, any>;
    startAt?: string | null;
    endAt?: string | null;
};
//# sourceMappingURL=CreateAdsCampaignRequest.d.ts.map