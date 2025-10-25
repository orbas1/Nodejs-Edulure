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
//# sourceMappingURL=ContentAsset.d.ts.map