export declare class SdkAuthError extends Error {
    readonly cause?: unknown;
    constructor(message: string, options?: {
        cause?: unknown;
    });
}
export declare class MissingAccessTokenError extends SdkAuthError {
    constructor(message?: string, options?: {
        cause?: unknown;
    });
}
export declare class TokenRefreshFailedError extends SdkAuthError {
    constructor(message?: string, options?: {
        cause?: unknown;
    });
}
//# sourceMappingURL=errors.d.ts.map