import type { ObservabilitySloDetailResponse } from '../models/ObservabilitySloDetailResponse';
import type { ObservabilitySloListResponse } from '../models/ObservabilitySloListResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
export declare class ObservabilityService {
    /**
     * Service level objectives
     * Returns the most recent error budget and latency snapshots for registered SLOs.
     * @param includeDefinition When true, include indicator and alert configuration with each snapshot.
     * @returns ObservabilitySloListResponse Current SLO snapshots.
     * @throws ApiError
     */
    static getObservabilitySlos(includeDefinition?: boolean): CancelablePromise<ObservabilitySloListResponse>;
    /**
     * Service level objective detail
     * Returns the current snapshot for a specific service level objective.
     * @param sloId Identifier of the service level objective to inspect.
     * @param includeDefinition When true, include indicator and alert configuration with the snapshot.
     * @returns ObservabilitySloDetailResponse SLO snapshot.
     * @throws ApiError
     */
    static getObservabilitySlos1(sloId: string, includeDefinition?: boolean): CancelablePromise<ObservabilitySloDetailResponse>;
}
//# sourceMappingURL=ObservabilityService.d.ts.map