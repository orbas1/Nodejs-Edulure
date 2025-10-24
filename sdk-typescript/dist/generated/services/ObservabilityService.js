import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ObservabilityService {
    /**
     * Service level objectives
     * Returns the most recent error budget and latency snapshots for registered SLOs.
     * @param includeDefinition When true, include indicator and alert configuration with each snapshot.
     * @returns ObservabilitySloListResponse Current SLO snapshots.
     * @throws ApiError
     */
    static getObservabilitySlos(includeDefinition = true) {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/observability/slos',
            query: {
                'includeDefinition': includeDefinition,
            },
            errors: {
                401: `Missing or invalid token`,
                403: `Insufficient permissions`,
            },
        });
    }
    /**
     * Service level objective detail
     * Returns the current snapshot for a specific service level objective.
     * @param sloId Identifier of the service level objective to inspect.
     * @param includeDefinition When true, include indicator and alert configuration with the snapshot.
     * @returns ObservabilitySloDetailResponse SLO snapshot.
     * @throws ApiError
     */
    static getObservabilitySlos1(sloId, includeDefinition = true) {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/observability/slos/{sloId}',
            path: {
                'sloId': sloId,
            },
            query: {
                'includeDefinition': includeDefinition,
            },
            errors: {
                401: `Missing or invalid token`,
                403: `Insufficient permissions`,
                404: `SLO not found`,
            },
        });
    }
}
//# sourceMappingURL=ObservabilityService.js.map