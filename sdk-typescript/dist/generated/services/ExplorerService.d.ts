import type { ExplorerSearchRequest } from '../models/ExplorerSearchRequest';
import type { ExplorerSearchResponse } from '../models/ExplorerSearchResponse';
import type { SavedExplorerSearch } from '../models/SavedExplorerSearch';
import type { SavedExplorerSearchRequest } from '../models/SavedExplorerSearchRequest';
import type { StandardResponse } from '../models/StandardResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
export declare class ExplorerService {
    /**
     * Federated explorer search
     * @param requestBody
     * @returns any Explorer results returned successfully
     * @throws ApiError
     */
    static postExplorerSearch(requestBody: ExplorerSearchRequest): CancelablePromise<(StandardResponse & {
        data?: ExplorerSearchResponse;
    })>;
    /**
     * List saved explorer searches
     * @returns any Saved searches retrieved
     * @throws ApiError
     */
    static getExplorerSavedSearches(): CancelablePromise<(StandardResponse & {
        data?: Array<SavedExplorerSearch>;
    })>;
    /**
     * Create a saved explorer search
     * @param requestBody
     * @returns any Saved search created
     * @throws ApiError
     */
    static postExplorerSavedSearches(requestBody: SavedExplorerSearchRequest): CancelablePromise<(StandardResponse & {
        data?: SavedExplorerSearch;
    })>;
    /**
     * Get a saved explorer search
     * @param savedSearchId
     * @returns any Saved search retrieved
     * @throws ApiError
     */
    static getExplorerSavedSearches1(savedSearchId: number): CancelablePromise<(StandardResponse & {
        data?: SavedExplorerSearch;
    })>;
    /**
     * Update a saved explorer search
     * @param savedSearchId
     * @param requestBody
     * @returns any Saved search updated
     * @throws ApiError
     */
    static patchExplorerSavedSearches(savedSearchId: number, requestBody: SavedExplorerSearchRequest): CancelablePromise<(StandardResponse & {
        data?: SavedExplorerSearch;
    })>;
    /**
     * Delete a saved explorer search
     * @param savedSearchId
     * @returns StandardResponse Saved search deleted
     * @throws ApiError
     */
    static deleteExplorerSavedSearches(savedSearchId: number): CancelablePromise<StandardResponse>;
}
//# sourceMappingURL=ExplorerService.d.ts.map