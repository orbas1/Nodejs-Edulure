/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ExplorerSearchRequest } from '../models/ExplorerSearchRequest';
import type { ExplorerSearchResponse } from '../models/ExplorerSearchResponse';
import type { SavedExplorerSearch } from '../models/SavedExplorerSearch';
import type { SavedExplorerSearchRequest } from '../models/SavedExplorerSearchRequest';
import type { StandardResponse } from '../models/StandardResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ExplorerService {
    /**
     * Federated explorer search
     * @param requestBody
     * @returns any Explorer results returned successfully
     * @throws ApiError
     */
    public static postExplorerSearch(
        requestBody: ExplorerSearchRequest,
    ): CancelablePromise<(StandardResponse & {
        data?: ExplorerSearchResponse;
    })> {
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
    public static getExplorerSavedSearches(): CancelablePromise<(StandardResponse & {
        data?: Array<SavedExplorerSearch>;
    })> {
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
    public static postExplorerSavedSearches(
        requestBody: SavedExplorerSearchRequest,
    ): CancelablePromise<(StandardResponse & {
        data?: SavedExplorerSearch;
    })> {
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
    public static getExplorerSavedSearches1(
        savedSearchId: number,
    ): CancelablePromise<(StandardResponse & {
        data?: SavedExplorerSearch;
    })> {
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
    public static patchExplorerSavedSearches(
        savedSearchId: number,
        requestBody: SavedExplorerSearchRequest,
    ): CancelablePromise<(StandardResponse & {
        data?: SavedExplorerSearch;
    })> {
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
    public static deleteExplorerSavedSearches(
        savedSearchId: number,
    ): CancelablePromise<StandardResponse> {
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
