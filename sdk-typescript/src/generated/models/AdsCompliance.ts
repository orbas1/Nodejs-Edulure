/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AdsComplianceViolation } from './AdsComplianceViolation';
export type AdsCompliance = {
    status?: 'pass' | 'needs_review' | 'halted';
    riskScore?: number;
    violations?: Array<AdsComplianceViolation>;
};

