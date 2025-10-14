/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
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

