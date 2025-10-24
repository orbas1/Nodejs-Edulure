import type { ApiRequestOptions } from '../generated/core/ApiRequestOptions';
import type { OpenAPIConfig } from '../generated/core/OpenAPI';
type TokenResolver = () => Promise<string | null | undefined> | string | null | undefined;
export type HeaderResolver = Record<string, string | number | boolean | null | undefined> | ((options: ApiRequestOptions) => Promise<Record<string, string>> | Record<string, string>);
export type ConfigureSdkOptions = {
    baseUrl: string;
    version?: string;
    getAccessToken?: TokenResolver;
    defaultHeaders?: HeaderResolver;
    withCredentials?: boolean;
    credentials?: OpenAPIConfig['CREDENTIALS'];
    userAgent?: string;
    onConfig?: (config: OpenAPIConfig) => void;
};
export declare function configureSdk({ baseUrl, version, getAccessToken, defaultHeaders, withCredentials, credentials, userAgent, onConfig }: ConfigureSdkOptions): OpenAPIConfig;
export {};
//# sourceMappingURL=configure.d.ts.map