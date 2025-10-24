import type { ApiRequestOptions } from '../generated/core/ApiRequestOptions';

export type HeaderValue = string | number | boolean | null | undefined;
export type HeaderDictionary = Record<string, HeaderValue>;
export type HeaderProducer = (options: ApiRequestOptions) => Promise<Record<string, string>>;

export function normaliseHeaders(raw?: HeaderDictionary): Record<string, string> {
  if (!raw) {
    return {};
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

export function mergeHeaderProducers(
  producers: HeaderProducer[],
  staticUserAgent?: string
): ((options: ApiRequestOptions) => Promise<Record<string, string>>) | undefined {
  if (!producers.length && !staticUserAgent) {
    return undefined;
  }
  return async (options) => {
    const headers: Record<string, string> = {};
    for (const producer of producers) {
      const output = await producer(options);
      for (const [key, value] of Object.entries(output)) {
        if (value === undefined || value === null) {
          continue;
        }
        headers[key] = value;
      }
    }
    if (staticUserAgent && !('User-Agent' in headers) && !('user-agent' in headers)) {
      headers['User-Agent'] = staticUserAgent;
    }
    return headers;
  };
}
