import type { ApiRequestOptions } from '../generated/core/ApiRequestOptions';
import type { TokenSet, TokenStore, TokenStoreListener, TokenStoreOptions } from './tokenStore';
type Clock = () => number;
type HeaderMap = Record<string, string>;
export type TokenRefreshHandler = (current: TokenSet | null) => Promise<TokenSet | null | undefined>;
export type SessionManagerEvents = {
    onRefreshStart?: (current: TokenSet | null) => void;
    onRefreshSuccess?: (next: TokenSet | null) => void;
    onRefreshError?: (error: unknown) => void;
};
export type BackgroundRefreshOptions = {
    intervalMs?: number;
    autoStart?: boolean;
};
export type SessionManagerOptions = SessionManagerEvents & {
    store?: TokenStore;
    tokenStoreOptions?: TokenStoreOptions;
    refresh?: TokenRefreshHandler;
    refreshMarginMs?: number;
    clock?: Clock;
    backgroundRefresh?: boolean | BackgroundRefreshOptions;
};
export interface SessionManager {
    readonly store: TokenStore;
    getTokenSet(): Promise<TokenSet | null>;
    setTokenSet(tokenSet: TokenSet | null): Promise<void>;
    updateTokenSet(patch: Partial<TokenSet>): Promise<TokenSet | null>;
    getAccessToken(): Promise<string | null>;
    ensureFreshToken(): Promise<string | null>;
    refresh(): Promise<TokenSet | null>;
    clear(): Promise<void>;
    subscribe(listener: TokenStoreListener): () => void;
    isExpired(graceMs?: number): Promise<boolean>;
    startBackgroundRefresh(): void;
    stopBackgroundRefresh(): void;
    isBackgroundRefreshRunning(): boolean;
}
type AsyncHeaderResolver = (options: ApiRequestOptions) => Promise<HeaderMap> | HeaderMap;
export type AuthorizationHeaderOptions = {
    header?: string;
    scheme?: string;
    refresh?: boolean;
    allowEmpty?: boolean;
};
export declare function createSessionManager({ store: providedStore, tokenStoreOptions, refresh, refreshMarginMs, clock, onRefreshStart, onRefreshSuccess, onRefreshError, backgroundRefresh, }?: SessionManagerOptions): SessionManager;
export declare function formatAuthorizationHeader(token: string, scheme?: string): string;
export declare function createAuthorizationHeaderResolver(session: SessionManager, { header, scheme, refresh, allowEmpty }?: AuthorizationHeaderOptions): AsyncHeaderResolver;
export {};
//# sourceMappingURL=auth.d.ts.map