export type VerificationAuditEntry = {
    id?: number;
    action?: string;
    notes?: string | null;
    actor?: {
        id?: number;
        name?: string;
        email?: string;
    } | null;
    metadata?: Record<string, any>;
    createdAt?: string;
};
//# sourceMappingURL=VerificationAuditEntry.d.ts.map