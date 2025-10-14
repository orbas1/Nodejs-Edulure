/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ContentAsset } from './ContentAsset';
export type UploadSessionResponse = {
    asset: ContentAsset;
    upload: {
        url: string;
        bucket: string;
        key: string;
        expiresAt: string;
    };
};

