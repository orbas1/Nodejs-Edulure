/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
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

