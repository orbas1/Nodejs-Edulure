import type { ApiRequestOptions } from '../generated/core/ApiRequestOptions';
import type { OpenAPIConfig } from '../generated/core/OpenAPI';
import { OpenAPI } from '../generated/core/OpenAPI';

type TokenResolver = () => Promise<string | null | undefined> | string | null | undefined;

export type HeaderResolver =
  | Record<string, string | number | boolean | null | undefined>
  | ((options: ApiRequestOptions) => Promise<Record<string, string>> | Record<string, string>);

export type ConfigureSdkOptions = {
  baseUrl: string;
  version?: string;
  getAccessToken?: TokenResolver;
  defaultHeaders?: HeaderResolver;
  withCredentials?: boolean;
  credentials?: OpenAPIConfig['CREDENTIALS'];
};

function normaliseBaseUrl(baseUrl: string): string {
  if (!baseUrl) {
    throw new Error('configureSdk requires a baseUrl value');
  }
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
}

async function resolveHeaders(
  headers: HeaderResolver | undefined,
  options: ApiRequestOptions
): Promise<Record<string, string> | undefined> {
  if (!headers) {
    return undefined;
  }
  const raw = typeof headers === 'function' ? await headers(options) : headers;
  if (!raw) {
    return undefined;
  }
  const resolved: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value === undefined || value === null) {
      continue;
    }
    resolved[key] = String(value);
  }
  return resolved;
}

export function configureSdk({
  baseUrl,
  version,
  getAccessToken,
  defaultHeaders,
  withCredentials,
  credentials
}: ConfigureSdkOptions): OpenAPIConfig {
  const normalisedBase = normaliseBaseUrl(baseUrl);
  OpenAPI.BASE = normalisedBase;
  if (version) {
    OpenAPI.VERSION = version;
  }

  if (typeof getAccessToken === 'function') {
    OpenAPI.TOKEN = async () => {
      const value = await getAccessToken();
      return value ?? undefined;
    };
  } else if (typeof getAccessToken === 'string') {
    OpenAPI.TOKEN = getAccessToken;
  } else {
    OpenAPI.TOKEN = undefined;
  }

  if (defaultHeaders) {
    OpenAPI.HEADERS = async (options) => {
      const resolved = await resolveHeaders(defaultHeaders, options);
      return resolved ?? {};
    };
  } else {
    OpenAPI.HEADERS = undefined;
  }

  if (typeof withCredentials === 'boolean') {
    OpenAPI.WITH_CREDENTIALS = withCredentials;
    OpenAPI.CREDENTIALS = credentials ?? (withCredentials ? 'include' : 'same-origin');
  } else if (credentials) {
    OpenAPI.CREDENTIALS = credentials;
  }

  return OpenAPI;
}
