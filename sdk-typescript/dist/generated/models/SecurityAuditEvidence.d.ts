export type SecurityAuditEvidence = {
    id?: number;
    evidenceUuid?: string;
    tenantId?: string;
    riskId?: number | null;
    framework?: string | null;
    controlReference?: string | null;
    evidenceType?: string;
    storagePath?: string;
    checksum?: string | null;
    sources?: Array<string>;
    capturedAt?: string;
    expiresAt?: string | null;
    status?: string;
    submittedBy?: number | null;
    submittedByEmail?: string | null;
    description?: string | null;
    metadata?: Record<string, any>;
    createdAt?: string;
    updatedAt?: string;
};
//# sourceMappingURL=SecurityAuditEvidence.d.ts.map