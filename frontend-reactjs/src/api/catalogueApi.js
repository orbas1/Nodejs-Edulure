import { httpClient } from './httpClient.js';

export function listPublicLiveClassrooms({ params, signal } = {}) {
  return httpClient.get('/catalogue/live-classrooms', {
    params,
    signal,
    cache: {
      ttl: 60_000,
      tags: ['catalogue:live-classrooms']
    }
  });
}

export function listPublicCourses({ params, signal } = {}) {
  return httpClient.get('/catalogue/courses', {
    params,
    signal,
    cache: {
      ttl: 60_000,
      tags: ['catalogue:courses']
    }
  });
}

export function listPublicTutors({ params, signal } = {}) {
  return httpClient.get('/catalogue/tutors', {
    params,
    signal,
    cache: {
      ttl: 60_000,
      tags: ['catalogue:tutors']
    }
  });
}

const catalogueApi = {
  listPublicLiveClassrooms,
  listPublicCourses,
  listPublicTutors
};

export default catalogueApi;
