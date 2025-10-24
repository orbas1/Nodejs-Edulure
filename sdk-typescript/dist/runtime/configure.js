import { OpenAPI } from '../generated/core/OpenAPI';
import { sdkManifest } from './manifest';
function normaliseBaseUrl(baseUrl) {
    if (!baseUrl) {
        throw new Error('configureSdk requires a baseUrl value');
    }
    return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
}
async function resolveHeaders(headers, options) {
    if (!headers) {
        return undefined;
    }
    const raw = typeof headers === 'function' ? await headers(options) : headers;
    if (!raw) {
        return undefined;
    }
    const resolved = {};
    for (const [key, value] of Object.entries(raw)) {
        if (value === undefined || value === null) {
            continue;
        }
        resolved[key] = String(value);
    }
    return resolved;
}
export function configureSdk({ baseUrl, version, getAccessToken, defaultHeaders, withCredentials, credentials, userAgent, onConfig }) {
    const normalisedBase = normaliseBaseUrl(baseUrl);
    OpenAPI.BASE = normalisedBase;
    OpenAPI.VERSION = version ?? sdkManifest.specVersion;
    if (typeof getAccessToken === 'function') {
        OpenAPI.TOKEN = async () => {
            const value = await getAccessToken();
            return value ?? undefined;
        };
    }
    else if (typeof getAccessToken === 'string') {
        OpenAPI.TOKEN = getAccessToken;
    }
    else {
        OpenAPI.TOKEN = undefined;
    }
    const staticUserAgent = userAgent ?? undefined;
    if (defaultHeaders || staticUserAgent) {
        OpenAPI.HEADERS = async (options) => {
            const resolved = await resolveHeaders(defaultHeaders, options);
            const headers = resolved ? { ...resolved } : {};
            if (staticUserAgent && !headers['User-Agent'] && !headers['user-agent']) {
                headers['User-Agent'] = staticUserAgent;
            }
            return headers;
        };
    }
    else {
        OpenAPI.HEADERS = undefined;
    }
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