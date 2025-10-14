export type VerificationDocument = {
    id?: number;
    /**
     * Document type uploaded by the user
     */
    type?: string;
    status?: 'pending' | 'accepted' | 'rejected';
    fileName?: string;
    mimeType?: string;
    sizeBytes?: number;
    submittedAt?: string;
    reviewedAt?: string | null;
};
//# sourceMappingURL=VerificationDocument.d.ts.map