export class SdkAuthError extends Error {
    constructor(message, options = {}) {
        super(message);
        this.name = new.target.name;
        if (options.cause !== undefined) {
            this.cause = options.cause;
        }
    }
}
export class MissingAccessTokenError extends SdkAuthError {
    constructor(message = 'Access token is required for this operation.', options = {}) {
        super(message, options);
    }
}
export class TokenRefreshFailedError extends SdkAuthError {
    constructor(message = 'Token refresh failed.', options = {}) {
        super(message, options);
    }
}
//# sourceMappingURL=errors.js.map