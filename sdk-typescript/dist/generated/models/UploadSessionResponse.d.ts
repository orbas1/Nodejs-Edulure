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
//# sourceMappingURL=UploadSessionResponse.d.ts.map