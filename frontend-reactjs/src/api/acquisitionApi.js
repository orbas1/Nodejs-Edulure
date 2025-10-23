import { httpClient } from './httpClient.js';

export function listAcquisitionPlans({ signal } = {}) {
  return httpClient
    .get('/acquisition/plans', {
      signal,
      cache: {
        ttl: 60_000,
        tags: ['acquisition:plans']
      }
    })
    .then((response) => response?.data ?? []);
}

export default {
  listAcquisitionPlans
};
