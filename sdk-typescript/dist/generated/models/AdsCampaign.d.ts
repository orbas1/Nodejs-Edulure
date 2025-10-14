import type { AdsBudget } from './AdsBudget';
import type { AdsCompliance } from './AdsCompliance';
import type { AdsCreative } from './AdsCreative';
import type { AdsMetrics } from './AdsMetrics';
import type { AdsSchedule } from './AdsSchedule';
import type { AdsSpend } from './AdsSpend';
import type { AdsTargeting } from './AdsTargeting';
export type AdsCampaign = {
    id?: string;
    internalId?: number;
    name?: string;
    objective?: 'awareness' | 'traffic' | 'leads' | 'conversions';
    status?: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'archived';
    performanceScore?: number;
    budget?: AdsBudget;
    spend?: AdsSpend;
    metrics?: AdsMetrics;
    targeting?: AdsTargeting;
    creative?: AdsCreative;
    schedule?: AdsSchedule;
    compliance?: AdsCompliance;
    metadata?: Record<string, any>;
    createdBy?: number;
    createdAt?: string | null;
    updatedAt?: string | null;
};
//# sourceMappingURL=AdsCampaign.d.ts.map