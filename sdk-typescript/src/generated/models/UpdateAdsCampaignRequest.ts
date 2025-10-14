/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
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

