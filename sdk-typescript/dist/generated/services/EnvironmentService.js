import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class EnvironmentService {
    /**
     * Environment parity report
     * Returns the latest infrastructure parity evaluation, including manifest drift and dependency status.
     * @returns EnvironmentParityResponse Environment parity report generated successfully
     * @throws ApiError
     */
    static getEnvironmentParityReport() {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/environment/health',
            errors: {
                503: `Parity drift detected or dependency check failed`,
            },
        });
    }
}
//# sourceMappingURL=EnvironmentService.js.map