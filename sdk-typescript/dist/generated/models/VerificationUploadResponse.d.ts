export type VerificationUploadResponse = {
    verificationReference: string;
    documentType: string;
    upload: {
        bucket: string;
        key: string;
        url: string;
        expiresAt: string;
    };
};
//# sourceMappingURL=VerificationUploadResponse.d.ts.map