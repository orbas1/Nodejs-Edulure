import { OpenAPI } from '../generated/core/OpenAPI';
import { createSessionManager, formatAuthorizationHeader } from './auth';
import { mergeHeaderProducers, normaliseHeaders } from './base';
import { sdkManifest } from './manifest';
import { MissingAccessTokenError } from './errors';
function normaliseBaseUrl(baseUrl) {
    if (!baseUrl) {
        throw new Error('configureSdk requires a baseUrl value');
    }
    return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
}
function toHeaderProducer(resolver) {
    if (!resolver) {
        return undefined;
    }
    if (typeof resolver === 'function') {
        return async (options) => {
            const output = await resolver(options);
            return normaliseHeaders(output);
        };
    }
    return async () => normaliseHeaders(resolver);
}
function normaliseTokenResolver(resolver) {
    if (resolver === undefined || resolver === null) {
        return undefined;
    }
    if (typeof resolver === 'function') {
        return async () => {
            const value = await resolver();
            return value ?? undefined;
        };
    }
    if (typeof resolver === 'string') {
        if (resolver) {
            return async () => resolver;
        }
        return undefined;
    }
    return undefined;
}
function buildSessionManager(auth) {
    if (!auth) {
        return undefined;
    }
    if (auth.sessionManager) {
        return auth.sessionManager;
    }
    const { tokenStore, tokenStoreOptions, refresh, refreshMarginMs, onRefreshError, onRefreshStart, onRefreshSuccess, clock, backgroundRefresh, } = auth;
    const sessionOptions = {
        store: tokenStore,
        tokenStoreOptions,
        refresh,
        refreshMarginMs,
        onRefreshError,
        onRefreshStart,
        onRefreshSuccess,
        clock,
        backgroundRefresh,
    };
    return createSessionManager(sessionOptions);
}
function createTokenHeaderProducer(resolver, scheme, headerName, allowAnonymous) {
    return async (options) => {
        const token = await resolver(options);
        if (!token) {
            if (allowAnonymous) {
                return {};
            }
            throw new MissingAccessTokenError('Access token is required but none was resolved.');
        }
        const value = scheme ? formatAuthorizationHeader(token, scheme) : token;
        return { [headerName]: value };
    };
}
export function configureSdk({ baseUrl, version, getAccessToken, defaultHeaders, withCredentials, credentials, userAgent, onConfig, auth, }) {
    const normalisedBase = normaliseBaseUrl(baseUrl);
    OpenAPI.BASE = normalisedBase;
    OpenAPI.VERSION = version ?? sdkManifest.specVersion;
    const session = buildSessionManager(auth);
    if (session && auth?.onSession) {
        auth.onSession(session);
    }
    const autoRefresh = auth?.autoRefresh !== false;
    const allowAnonymous = auth?.allowAnonymous ?? true;
    const scheme = auth?.scheme ?? 'Bearer';
    const headerName = auth?.headerName ?? 'Authorization';
    const providedTokenResolver = normaliseTokenResolver(auth?.getAccessToken ?? getAccessToken);
    const sessionTokenResolver = session
        ? async () => {
            const token = autoRefresh ? await session.ensureFreshToken() : await session.getAccessToken();
            return token ?? undefined;
        }
        : undefined;
    const tokenResolver = providedTokenResolver ?? sessionTokenResolver;
    const headerProducers = [];
    const defaultHeaderProducer = toHeaderProducer(defaultHeaders);
    if (defaultHeaderProducer) {
        headerProducers.push(defaultHeaderProducer);
    }
    if (tokenResolver) {
        if (scheme === 'Bearer' && headerName === 'Authorization') {
            OpenAPI.TOKEN = async (options) => {
                const value = await tokenResolver(options);
                return value ?? undefined;
            };
        }
        else {
            OpenAPI.TOKEN = undefined;
            headerProducers.push(createTokenHeaderProducer(tokenResolver, scheme, headerName, allowAnonymous));
        }
    }
    else {
        OpenAPI.TOKEN = undefined;
    }
    const staticUserAgent = userAgent ?? undefined;
    const combinedHeaders = mergeHeaderProducers(headerProducers, staticUserAgent);
    OpenAPI.HEADERS = combinedHeaders;
    if (typeof withCredentials === 'boolean') {
        OpenAPI.WITH_CREDENTIALS = withCredentials;
        OpenAPI.CREDENTIALS = credentials ?? (withCredentials ? 'include' : 'same-origin');
    }
    else if (credentials) {
        OpenAPI.CREDENTIALS = credentials;
    }
    if (onConfig) {
        onConfig(OpenAPI);
    }
    return OpenAPI;
}
//# sourceMappingURL=configure.js.map