/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ContentAsset = {
    publicId: string;
    originalFilename: string;
    type: 'powerpoint' | 'ebook' | 'pdf' | 'document' | 'video';
    status: string;
    visibility: string;
    updatedAt?: string | null;
    metadata?: Record<string, any> | null;
    /**
     * Learning cluster assignment used across discovery surfaces.
     */
    clusterKey?: string;
};

