import type { ApiRequestOptions } from '../generated/core/ApiRequestOptions';
export type HeaderValue = string | number | boolean | null | undefined;
export type HeaderDictionary = Record<string, HeaderValue>;
export type HeaderProducer = (options: ApiRequestOptions) => Promise<Record<string, string>>;
export declare function normaliseHeaders(raw?: HeaderDictionary): Record<string, string>;
export declare function mergeHeaderProducers(producers: HeaderProducer[], staticUserAgent?: string): ((options: ApiRequestOptions) => Promise<Record<string, string>>) | undefined;
//# sourceMappingURL=base.d.ts.map