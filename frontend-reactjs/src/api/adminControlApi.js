import { httpClient } from './httpClient.js';

function normaliseList(response) {
  return {
    data: response?.data ?? [],
    meta: response?.meta ?? {}
  };
}

function extractData(response) {
  return response?.data ?? null;
}

export function listCommunities({ token, params, signal } = {}) {
  return httpClient.get('/admin/control/communities', { token, params, signal }).then(normaliseList);
}

export function createCommunity({ token, payload, signal } = {}) {
  return httpClient.post('/admin/control/communities', payload, { token, signal }).then(extractData);
}

export function updateCommunity({ token, id, payload, signal } = {}) {
  if (!id) {
    throw new Error('Community id is required');
  }
  return httpClient.put(`/admin/control/communities/${id}`, payload, { token, signal }).then(extractData);
}

export function deleteCommunity({ token, id, signal } = {}) {
  if (!id) {
    throw new Error('Community id is required');
  }
  return httpClient.delete(`/admin/control/communities/${id}`, { token, signal }).then(extractData);
}

export function listCourses({ token, params, signal } = {}) {
  return httpClient.get('/admin/control/courses', { token, params, signal }).then(normaliseList);
}

export function createCourse({ token, payload, signal } = {}) {
  return httpClient.post('/admin/control/courses', payload, { token, signal }).then(extractData);
}

export function updateCourse({ token, id, payload, signal } = {}) {
  if (!id) {
    throw new Error('Course id is required');
  }
  return httpClient.put(`/admin/control/courses/${id}`, payload, { token, signal }).then(extractData);
}

export function deleteCourse({ token, id, signal } = {}) {
  if (!id) {
    throw new Error('Course id is required');
  }
  return httpClient.delete(`/admin/control/courses/${id}`, { token, signal }).then(extractData);
}

export function listTutors({ token, params, signal } = {}) {
  return httpClient.get('/admin/control/tutors', { token, params, signal }).then(normaliseList);
}

export function createTutor({ token, payload, signal } = {}) {
  return httpClient.post('/admin/control/tutors', payload, { token, signal }).then(extractData);
}

export function updateTutor({ token, id, payload, signal } = {}) {
  if (!id) {
    throw new Error('Tutor id is required');
  }
  return httpClient.put(`/admin/control/tutors/${id}`, payload, { token, signal }).then(extractData);
}

export function deleteTutor({ token, id, signal } = {}) {
  if (!id) {
    throw new Error('Tutor id is required');
  }
  return httpClient.delete(`/admin/control/tutors/${id}`, { token, signal }).then(extractData);
}

export function listEbooks({ token, params, signal } = {}) {
  return httpClient.get('/admin/control/ebooks', { token, params, signal }).then(normaliseList);
}

export function createEbook({ token, payload, signal } = {}) {
  return httpClient.post('/admin/control/ebooks', payload, { token, signal }).then(extractData);
}

export function updateEbook({ token, id, payload, signal } = {}) {
  if (!id) {
    throw new Error('E-book id is required');
  }
  return httpClient.put(`/admin/control/ebooks/${id}`, payload, { token, signal }).then(extractData);
}

export function deleteEbook({ token, id, signal } = {}) {
  if (!id) {
    throw new Error('E-book id is required');
  }
  return httpClient.delete(`/admin/control/ebooks/${id}`, { token, signal }).then(extractData);
}

export function listLiveStreams({ token, params, signal } = {}) {
  return httpClient.get('/admin/control/live-streams', { token, params, signal }).then(normaliseList);
}

export function createLiveStream({ token, payload, signal } = {}) {
  return httpClient.post('/admin/control/live-streams', payload, { token, signal }).then(extractData);
}

export function updateLiveStream({ token, id, payload, signal } = {}) {
  if (!id) {
    throw new Error('Live stream id is required');
  }
  return httpClient.put(`/admin/control/live-streams/${id}`, payload, { token, signal }).then(extractData);
}

export function deleteLiveStream({ token, id, signal } = {}) {
  if (!id) {
    throw new Error('Live stream id is required');
  }
  return httpClient.delete(`/admin/control/live-streams/${id}`, { token, signal }).then(extractData);
}

export function listPodcastShows({ token, params, signal } = {}) {
  return httpClient.get('/admin/control/podcasts', { token, params, signal }).then(normaliseList);
}

export function createPodcastShow({ token, payload, signal } = {}) {
  return httpClient.post('/admin/control/podcasts', payload, { token, signal }).then(extractData);
}

export function updatePodcastShow({ token, id, payload, signal } = {}) {
  if (!id) {
    throw new Error('Podcast show id is required');
  }
  return httpClient.put(`/admin/control/podcasts/${id}`, payload, { token, signal }).then(extractData);
}

export function deletePodcastShow({ token, id, signal } = {}) {
  if (!id) {
    throw new Error('Podcast show id is required');
  }
  return httpClient.delete(`/admin/control/podcasts/${id}`, { token, signal }).then(extractData);
}

export function listPodcastEpisodes(showId, { token, params, signal } = {}) {
  if (!showId) {
    throw new Error('Podcast show id is required');
  }
  return httpClient.get(`/admin/control/podcasts/${showId}/episodes`, { token, params, signal }).then(normaliseList);
}

export function createPodcastEpisode(showId, { token, payload, signal } = {}) {
  if (!showId) {
    throw new Error('Podcast show id is required');
  }
  return httpClient.post(`/admin/control/podcasts/${showId}/episodes`, payload, { token, signal }).then(extractData);
}

export function updatePodcastEpisode(showId, episodeId, { token, payload, signal } = {}) {
  if (!showId || !episodeId) {
    throw new Error('Podcast show id and episode id are required');
  }
  return httpClient.put(`/admin/control/podcasts/${showId}/episodes/${episodeId}`, payload, { token, signal }).then(extractData);
}

export function deletePodcastEpisode(showId, episodeId, { token, signal } = {}) {
  if (!showId || !episodeId) {
    throw new Error('Podcast show id and episode id are required');
  }
  return httpClient.delete(`/admin/control/podcasts/${showId}/episodes/${episodeId}`, { token, signal }).then(extractData);
}

const adminControlApi = {
  listCommunities,
  createCommunity,
  updateCommunity,
  deleteCommunity,
  listCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  listTutors,
  createTutor,
  updateTutor,
  deleteTutor,
  listEbooks,
  createEbook,
  updateEbook,
  deleteEbook,
  listLiveStreams,
  createLiveStream,
  updateLiveStream,
  deleteLiveStream,
  listPodcastShows,
  createPodcastShow,
  updatePodcastShow,
  deletePodcastShow,
  listPodcastEpisodes,
  createPodcastEpisode,
  updatePodcastEpisode,
  deletePodcastEpisode
};

export default adminControlApi;
