import type { EnvironmentParityResponse } from '../models/EnvironmentParityResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
export declare class EnvironmentService {
    /**
     * Environment parity report
     * Returns the latest infrastructure parity evaluation, including manifest drift and dependency status.
     * @returns EnvironmentParityResponse Environment parity report generated successfully
     * @throws ApiError
     */
    static getEnvironmentParityReport(): CancelablePromise<EnvironmentParityResponse>;
}
//# sourceMappingURL=EnvironmentService.d.ts.map