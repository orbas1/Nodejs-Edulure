export type TokenScope = string | string[] | null | undefined;
export type TokenSet = {
    accessToken: string | null;
    refreshToken?: string | null;
    idToken?: string | null;
    tokenType?: string | null;
    scope?: TokenScope;
    expiresAt?: number | string | null;
    expiresIn?: number | null;
    issuedAt?: number | null;
    metadata?: Record<string, unknown> | null;
};
export type TokenStoreListener = (tokenSet: TokenSet | null) => void;
export interface TokenStorageAdapter {
    load(): Promise<TokenSet | null | undefined>;
    save(tokenSet: TokenSet | null): Promise<void>;
    readonly syncKey?: string;
}
export type TokenStoreOptions = {
    initialTokenSet?: TokenSet | null;
    storageAdapter?: TokenStorageAdapter;
    clock?: () => number;
    autoHydrate?: boolean;
    syncStorageKey?: string;
    storageEventTarget?: {
        addEventListener(type: 'storage', listener: (event: StorageEvent) => void): void;
        removeEventListener(type: 'storage', listener: (event: StorageEvent) => void): void;
    };
};
export interface TokenStore {
    get(): Promise<TokenSet | null>;
    set(tokenSet: TokenSet | null | undefined): Promise<void>;
    update(partial: Partial<TokenSet>): Promise<TokenSet | null>;
    clear(): Promise<void>;
    subscribe(listener: TokenStoreListener): () => void;
    isExpired(graceMs?: number): Promise<boolean>;
    destroy?(): Promise<void>;
}
export declare function createTokenStore({ initialTokenSet, storageAdapter, clock: providedClock, autoHydrate, syncStorageKey, storageEventTarget, }?: TokenStoreOptions): TokenStore;
export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export declare function createBrowserStorageAdapter(storage: StorageLike, key: string): TokenStorageAdapter;
//# sourceMappingURL=tokenStore.d.ts.map