export class SdkAuthError extends Error {
  public readonly cause?: unknown;

  constructor(message: string, options: { cause?: unknown } = {}) {
    super(message);
    this.name = new.target.name;
    if (options.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}

export class MissingAccessTokenError extends SdkAuthError {
  constructor(message = 'Access token is required for this operation.', options: { cause?: unknown } = {}) {
    super(message, options);
  }
}

export class TokenRefreshFailedError extends SdkAuthError {
  constructor(message = 'Token refresh failed.', options: { cause?: unknown } = {}) {
    super(message, options);
  }
}
