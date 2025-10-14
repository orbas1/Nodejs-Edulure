import type { AdsComplianceViolation } from './AdsComplianceViolation';
export type AdsCompliance = {
    status?: 'pass' | 'needs_review' | 'halted';
    riskScore?: number;
    violations?: Array<AdsComplianceViolation>;
};
//# sourceMappingURL=AdsCompliance.d.ts.map