import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ExplorerService {
    /**
     * Federated explorer search
     * @param requestBody
     * @returns any Explorer results returned successfully
     * @throws ApiError
     */
    static postExplorerSearch(requestBody) {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/explorer/search',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation error`,
            },
        });
    }
    /**
     * List saved explorer searches
     * @returns any Saved searches retrieved
     * @throws ApiError
     */
    static getExplorerSavedSearches() {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/explorer/saved-searches',
            errors: {
                401: `Authentication required`,
            },
        });
    }
    /**
     * Create a saved explorer search
     * @param requestBody
     * @returns any Saved search created
     * @throws ApiError
     */
    static postExplorerSavedSearches(requestBody) {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/explorer/saved-searches',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Authentication required`,
                409: `Saved search name already exists`,
            },
        });
    }
    /**
     * Get a saved explorer search
     * @param savedSearchId
     * @returns any Saved search retrieved
     * @throws ApiError
     */
    static getExplorerSavedSearches1(savedSearchId) {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/explorer/saved-searches/{savedSearchId}',
            path: {
                'savedSearchId': savedSearchId,
            },
            errors: {
                401: `Authentication required`,
                404: `Saved search not found`,
            },
        });
    }
    /**
     * Update a saved explorer search
     * @param savedSearchId
     * @param requestBody
     * @returns any Saved search updated
     * @throws ApiError
     */
    static patchExplorerSavedSearches(savedSearchId, requestBody) {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/explorer/saved-searches/{savedSearchId}',
            path: {
                'savedSearchId': savedSearchId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Authentication required`,
                404: `Saved search not found`,
            },
        });
    }
    /**
     * Delete a saved explorer search
     * @param savedSearchId
     * @returns StandardResponse Saved search deleted
     * @throws ApiError
     */
    static deleteExplorerSavedSearches(savedSearchId) {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/explorer/saved-searches/{savedSearchId}',
            path: {
                'savedSearchId': savedSearchId,
            },
            errors: {
                401: `Authentication required`,
                404: `Saved search not found`,
            },
        });
    }
}
//# sourceMappingURL=ExplorerService.js.map