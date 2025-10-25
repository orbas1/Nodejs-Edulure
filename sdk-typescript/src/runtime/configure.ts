import type { ApiRequestOptions } from '../generated/core/ApiRequestOptions';
import type { OpenAPIConfig } from '../generated/core/OpenAPI';
import { OpenAPI } from '../generated/core/OpenAPI';

import { createSessionManager, formatAuthorizationHeader } from './auth';
import type {
  BackgroundRefreshOptions,
  SessionManager,
  SessionManagerEvents,
  SessionManagerOptions,
  TokenRefreshHandler,
} from './auth';
import { mergeHeaderProducers, normaliseHeaders } from './base';
import type { HeaderDictionary, HeaderProducer } from './base';
import { sdkManifest } from './manifest';
import type { TokenStore } from './tokenStore';
import type { TokenStoreOptions } from './tokenStore';
import { MissingAccessTokenError } from './errors';
type TokenResolver = () => Promise<string | null | undefined> | string | null | undefined;

type AsyncTokenResolver = (options: ApiRequestOptions) => Promise<string | undefined>;

type HeaderResolverFunction = (options: ApiRequestOptions) => Promise<HeaderDictionary> | HeaderDictionary;

export type HeaderResolver = HeaderDictionary | HeaderResolverFunction;

export type ConfigureAuthOptions = {
  sessionManager?: SessionManager;
  tokenStore?: TokenStore;
  tokenStoreOptions?: TokenStoreOptions;
  refresh?: TokenRefreshHandler;
  refreshMarginMs?: number;
  autoRefresh?: boolean;
  allowAnonymous?: boolean;
  scheme?: string;
  headerName?: string;
  getAccessToken?: TokenResolver;
  onSession?: (session: SessionManager) => void;
  onRefreshStart?: SessionManagerEvents['onRefreshStart'];
  onRefreshSuccess?: SessionManagerEvents['onRefreshSuccess'];
  onRefreshError?: SessionManagerEvents['onRefreshError'];
  clock?: SessionManagerOptions['clock'];
  backgroundRefresh?: boolean | BackgroundRefreshOptions;
};

export type ConfigureSdkOptions = {
  baseUrl: string;
  version?: string;
  getAccessToken?: TokenResolver;
  defaultHeaders?: HeaderResolver;
  withCredentials?: boolean;
  credentials?: OpenAPIConfig['CREDENTIALS'];
  userAgent?: string;
  onConfig?: (config: OpenAPIConfig) => void;
  auth?: ConfigureAuthOptions;
};

function normaliseBaseUrl(baseUrl: string): string {
  if (!baseUrl) {
    throw new Error('configureSdk requires a baseUrl value');
  }
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
}

function toHeaderProducer(resolver?: HeaderResolver): HeaderProducer | undefined {
  if (!resolver) {
    return undefined;
  }
  if (typeof resolver === 'function') {
    return async (options: ApiRequestOptions) => {
      const output = await (resolver as HeaderResolverFunction)(options);
      return normaliseHeaders(output);
    };
  }
  return async () => normaliseHeaders(resolver);
}

function normaliseTokenResolver(resolver?: TokenResolver): AsyncTokenResolver | undefined {
  if (resolver === undefined || resolver === null) {
    return undefined;
  }
  if (typeof resolver === 'function') {
    return async () => {
      const value = await (resolver as () => Promise<string | null | undefined> | string | null | undefined)();
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

function buildSessionManager(auth?: ConfigureAuthOptions): SessionManager | undefined {
  if (!auth) {
    return undefined;
  }
  if (auth.sessionManager) {
    return auth.sessionManager;
  }
  const {
    tokenStore,
    tokenStoreOptions,
    refresh,
    refreshMarginMs,
    onRefreshError,
    onRefreshStart,
    onRefreshSuccess,
    clock,
    backgroundRefresh,
  } = auth;
  const sessionOptions: SessionManagerOptions = {
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

function createTokenHeaderProducer(
  resolver: AsyncTokenResolver,
  scheme: string,
  headerName: string,
  allowAnonymous: boolean
): HeaderProducer {
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

export function configureSdk({
  baseUrl,
  version,
  getAccessToken,
  defaultHeaders,
  withCredentials,
  credentials,
  userAgent,
  onConfig,
  auth,
}: ConfigureSdkOptions): OpenAPIConfig {
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
  const sessionTokenResolver: AsyncTokenResolver | undefined = session
    ? async () => {
        const token = autoRefresh ? await session.ensureFreshToken() : await session.getAccessToken();
        return token ?? undefined;
      }
    : undefined;

  const tokenResolver = providedTokenResolver ?? sessionTokenResolver;

  const headerProducers: HeaderProducer[] = [];
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
    } else {
      OpenAPI.TOKEN = undefined;
      headerProducers.push(createTokenHeaderProducer(tokenResolver, scheme, headerName, allowAnonymous));
    }
  } else {
    OpenAPI.TOKEN = undefined;
  }

  const staticUserAgent = userAgent ?? undefined;
  const combinedHeaders = mergeHeaderProducers(headerProducers, staticUserAgent);
  OpenAPI.HEADERS = combinedHeaders;

  if (typeof withCredentials === 'boolean') {
    OpenAPI.WITH_CREDENTIALS = withCredentials;
    OpenAPI.CREDENTIALS = credentials ?? (withCredentials ? 'include' : 'same-origin');
  } else if (credentials) {
    OpenAPI.CREDENTIALS = credentials;
  }

  if (onConfig) {
    onConfig(OpenAPI);
  }

  return OpenAPI;
}
