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

export function createCommunity({ token, payload }) {
  return httpClient.post('/admin/control/communities', payload, { token }).then(extractData);
}

export function updateCommunity(communityId, { token, payload }) {
  return httpClient.put(`/admin/control/communities/${communityId}`, payload, { token }).then(extractData);
}

export function deleteCommunity(communityId, { token }) {
  return httpClient.delete(`/admin/control/communities/${communityId}`, { token }).then(extractData);
}

export function listCourses({ token, params, signal } = {}) {
  return httpClient.get('/admin/control/courses', { token, params, signal }).then(normaliseList);
}

export function createCourse({ token, payload }) {
  return httpClient.post('/admin/control/courses', payload, { token }).then(extractData);
}

export function updateCourse(courseId, { token, payload }) {
  return httpClient.put(`/admin/control/courses/${courseId}`, payload, { token }).then(extractData);
}

export function deleteCourse(courseId, { token }) {
  return httpClient.delete(`/admin/control/courses/${courseId}`, { token }).then(extractData);
}

export function listTutors({ token, params, signal } = {}) {
  return httpClient.get('/admin/control/tutors', { token, params, signal }).then(normaliseList);
}

export function createTutor({ token, payload }) {
  return httpClient.post('/admin/control/tutors', payload, { token }).then(extractData);
}

export function updateTutor(tutorId, { token, payload }) {
  return httpClient.put(`/admin/control/tutors/${tutorId}`, payload, { token }).then(extractData);
}

export function deleteTutor(tutorId, { token }) {
  return httpClient.delete(`/admin/control/tutors/${tutorId}`, { token }).then(extractData);
}

export function listEbooks({ token, params, signal } = {}) {
  return httpClient.get('/admin/control/ebooks', { token, params, signal }).then(normaliseList);
}

export function createEbook({ token, payload }) {
  return httpClient.post('/admin/control/ebooks', payload, { token }).then(extractData);
}

export function updateEbook(ebookId, { token, payload }) {
  return httpClient.put(`/admin/control/ebooks/${ebookId}`, payload, { token }).then(extractData);
}

export function deleteEbook(ebookId, { token }) {
  return httpClient.delete(`/admin/control/ebooks/${ebookId}`, { token }).then(extractData);
}

export function listLiveStreams({ token, params, signal } = {}) {
  return httpClient.get('/admin/control/live-streams', { token, params, signal }).then(normaliseList);
}

export function createLiveStream({ token, payload }) {
  return httpClient.post('/admin/control/live-streams', payload, { token }).then(extractData);
}

export function updateLiveStream(streamId, { token, payload }) {
  return httpClient.put(`/admin/control/live-streams/${streamId}`, payload, { token }).then(extractData);
}

export function deleteLiveStream(streamId, { token }) {
  return httpClient.delete(`/admin/control/live-streams/${streamId}`, { token }).then(extractData);
}

export function listPodcastShows({ token, params, signal } = {}) {
  return httpClient.get('/admin/control/podcasts', { token, params, signal }).then(normaliseList);
}

export function createPodcastShow({ token, payload }) {
  return httpClient.post('/admin/control/podcasts', payload, { token }).then(extractData);
}

export function updatePodcastShow(showId, { token, payload }) {
  return httpClient.put(`/admin/control/podcasts/${showId}`, payload, { token }).then(extractData);
}

export function deletePodcastShow(showId, { token }) {
  return httpClient.delete(`/admin/control/podcasts/${showId}`, { token }).then(extractData);
}

export function listPodcastEpisodes(showId, { token, params, signal } = {}) {
  if (!showId) {
    throw new Error('Podcast show id is required');
  }
  return httpClient.get(`/admin/control/podcasts/${showId}/episodes`, { token, params, signal }).then(normaliseList);
}

export function createPodcastEpisode(showId, { token, payload }) {
  if (!showId) {
    throw new Error('Podcast show id is required');
  }
  return httpClient.post(`/admin/control/podcasts/${showId}/episodes`, payload, { token }).then(extractData);
}

export function updatePodcastEpisode(showId, episodeId, { token, payload }) {
  if (!showId || !episodeId) {
    throw new Error('Podcast show id and episode id are required');
  }
  return httpClient.put(`/admin/control/podcasts/${showId}/episodes/${episodeId}`, payload, { token }).then(extractData);
}

export function deletePodcastEpisode(showId, episodeId, { token }) {
  if (!showId || !episodeId) {
    throw new Error('Podcast show id and episode id are required');
  }
  return httpClient.delete(`/admin/control/podcasts/${showId}/episodes/${episodeId}`, { token }).then(extractData);
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
