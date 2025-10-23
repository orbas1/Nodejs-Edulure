import { httpClient } from './httpClient.js';
import {
  assertId,
  assertToken,
  createInvalidationConfig,
  createListCacheConfig,
  normaliseListResponse
} from './apiUtils.js';

const CONTROL_CACHE_TAGS = {
  communities: 'admin:control:communities',
  courses: 'admin:control:courses',
  tutors: 'admin:control:tutors',
  ebooks: 'admin:control:ebooks',
  liveStreams: 'admin:control:live-streams',
  podcasts: 'admin:control:podcasts'
};

function normaliseList(response) {
  return normaliseListResponse(response, { defaultData: [], defaultMeta: {} });
}

function extractData(response) {
  return response?.data ?? response ?? null;
}

function normaliseAuditLog(response) {
  const payload = response?.data ?? response ?? {};
  return {
    entries: Array.isArray(payload.entries) ? payload.entries : [],
    totals: payload.totals ?? {},
    generatedAt: payload.generatedAt ?? null
  };
}

function normaliseComplianceAlert(alert) {
  if (!alert || typeof alert !== 'object') {
    return null;
  }
  const renewalDelta = Number(alert.renewalDeltaDays);
  return {
    id: alert.id ?? alert.publicId ?? null,
    vendor: alert.vendor ?? alert.vendorName ?? null,
    status: alert.status ?? null,
    riskTier: alert.riskTier ?? null,
    renewalDate: alert.renewalDate ?? null,
    renewalDeltaDays: Number.isFinite(renewalDelta) ? renewalDelta : null,
    ownerEmail: alert.ownerEmail ?? null,
    severity: String(alert.severity ?? 'info').toLowerCase(),
    summary: alert.summary ?? '',
    href: alert.href ?? null
  };
}

function normaliseChecklistCategory(category) {
  if (!category || typeof category !== 'object') {
    return null;
  }
  const total = Number.isFinite(Number(category.total)) ? Number(category.total) : 0;
  const autoEvaluated = Number.isFinite(Number(category.autoEvaluated))
    ? Number(category.autoEvaluated)
    : 0;
  const manual = Number.isFinite(Number(category.manual)) ? Number(category.manual) : total - autoEvaluated;
  return {
    id: category.id ?? category.slug ?? null,
    label: category.label ?? category.id ?? 'Category',
    total,
    autoEvaluated,
    manual,
    defaultOwners: Array.isArray(category.defaultOwners)
      ? category.defaultOwners.filter((owner) => typeof owner === 'string' && owner.length > 0)
      : []
  };
}

function normaliseOverview(response) {
  const payload = response?.data ?? response ?? {};
  const compliance = payload.compliance ?? {};
  const release = payload.release ?? {};
  const audit = payload.audit ?? {};

  return {
    compliance: {
      alerts: Array.isArray(compliance.alerts)
        ? compliance.alerts.map(normaliseComplianceAlert).filter(Boolean)
        : [],
      summary: compliance.summary ?? {}
    },
    release: {
      readiness: release.readiness ?? {},
      checklist: {
        totalItems: Number.isFinite(Number(release.checklist?.totalItems))
          ? Number(release.checklist.totalItems)
          : 0,
        autoEvaluated: Number.isFinite(Number(release.checklist?.autoEvaluated))
          ? Number(release.checklist.autoEvaluated)
          : 0,
        manual: Number.isFinite(Number(release.checklist?.manual))
          ? Number(release.checklist.manual)
          : 0,
        categories: Array.isArray(release.checklist?.categories)
          ? release.checklist.categories.map(normaliseChecklistCategory).filter(Boolean)
          : []
      }
    },
    audit: {
      totalsBySource: audit.totalsBySource ?? {},
      totalsBySeverity: audit.totalsBySeverity ?? {},
      generatedAt: audit.generatedAt ?? null
    }
  };
}

export function listCommunities({ token, params, signal } = {}) {
  assertToken(token, 'list communities');
  return httpClient
    .get('/admin/control/communities', {
      token,
      params,
      signal,
      cache: createListCacheConfig(CONTROL_CACHE_TAGS.communities)
    })
    .then(normaliseList);
}

export function createCommunity({ token, payload, signal } = {}) {
  assertToken(token, 'create a community');
  return httpClient
    .post('/admin/control/communities', payload, {
      token,
      signal,
      cache: createInvalidationConfig(CONTROL_CACHE_TAGS.communities)
    })
    .then(extractData);
}

export function updateCommunity({ token, id, payload, signal } = {}) {
  assertToken(token, 'update a community');
  assertId(id, 'Community id');
  return httpClient
    .put(`/admin/control/communities/${id}`, payload, {
      token,
      signal,
      cache: createInvalidationConfig([
        CONTROL_CACHE_TAGS.communities,
        `admin:control:community:${id}`
      ])
    })
    .then(extractData);
}

export function deleteCommunity({ token, id, signal } = {}) {
  assertToken(token, 'delete a community');
  assertId(id, 'Community id');
  return httpClient
    .delete(`/admin/control/communities/${id}`, {
      token,
      signal,
      cache: createInvalidationConfig([
        CONTROL_CACHE_TAGS.communities,
        `admin:control:community:${id}`
      ])
    })
    .then(extractData);
}

export function listCourses({ token, params, signal } = {}) {
  assertToken(token, 'list courses');
  return httpClient
    .get('/admin/control/courses', {
      token,
      params,
      signal,
      cache: createListCacheConfig(CONTROL_CACHE_TAGS.courses)
    })
    .then(normaliseList);
}

export function createCourse({ token, payload, signal } = {}) {
  assertToken(token, 'create a course');
  return httpClient
    .post('/admin/control/courses', payload, {
      token,
      signal,
      cache: createInvalidationConfig(CONTROL_CACHE_TAGS.courses)
    })
    .then(extractData);
}

export function updateCourse({ token, id, payload, signal } = {}) {
  assertToken(token, 'update a course');
  assertId(id, 'Course id');
  return httpClient
    .put(`/admin/control/courses/${id}`, payload, {
      token,
      signal,
      cache: createInvalidationConfig([
        CONTROL_CACHE_TAGS.courses,
        `admin:control:course:${id}`
      ])
    })
    .then(extractData);
}

export function deleteCourse({ token, id, signal } = {}) {
  assertToken(token, 'delete a course');
  assertId(id, 'Course id');
  return httpClient
    .delete(`/admin/control/courses/${id}`, {
      token,
      signal,
      cache: createInvalidationConfig([
        CONTROL_CACHE_TAGS.courses,
        `admin:control:course:${id}`
      ])
    })
    .then(extractData);
}

export function listTutors({ token, params, signal } = {}) {
  assertToken(token, 'list tutors');
  return httpClient
    .get('/admin/control/tutors', {
      token,
      params,
      signal,
      cache: createListCacheConfig(CONTROL_CACHE_TAGS.tutors)
    })
    .then(normaliseList);
}

export function createTutor({ token, payload, signal } = {}) {
  assertToken(token, 'create a tutor');
  return httpClient
    .post('/admin/control/tutors', payload, {
      token,
      signal,
      cache: createInvalidationConfig(CONTROL_CACHE_TAGS.tutors)
    })
    .then(extractData);
}

export function updateTutor({ token, id, payload, signal } = {}) {
  assertToken(token, 'update a tutor');
  assertId(id, 'Tutor id');
  return httpClient
    .put(`/admin/control/tutors/${id}`, payload, {
      token,
      signal,
      cache: createInvalidationConfig([
        CONTROL_CACHE_TAGS.tutors,
        `admin:control:tutor:${id}`
      ])
    })
    .then(extractData);
}

export function deleteTutor({ token, id, signal } = {}) {
  assertToken(token, 'delete a tutor');
  assertId(id, 'Tutor id');
  return httpClient
    .delete(`/admin/control/tutors/${id}`, {
      token,
      signal,
      cache: createInvalidationConfig([
        CONTROL_CACHE_TAGS.tutors,
        `admin:control:tutor:${id}`
      ])
    })
    .then(extractData);
}

export function listEbooks({ token, params, signal } = {}) {
  assertToken(token, 'list e-books');
  return httpClient
    .get('/admin/control/ebooks', {
      token,
      params,
      signal,
      cache: createListCacheConfig(CONTROL_CACHE_TAGS.ebooks)
    })
    .then(normaliseList);
}

export function createEbook({ token, payload, signal } = {}) {
  assertToken(token, 'create an e-book');
  return httpClient
    .post('/admin/control/ebooks', payload, {
      token,
      signal,
      cache: createInvalidationConfig(CONTROL_CACHE_TAGS.ebooks)
    })
    .then(extractData);
}

export function updateEbook({ token, id, payload, signal } = {}) {
  assertToken(token, 'update an e-book');
  assertId(id, 'E-book id');
  return httpClient
    .put(`/admin/control/ebooks/${id}`, payload, {
      token,
      signal,
      cache: createInvalidationConfig([
        CONTROL_CACHE_TAGS.ebooks,
        `admin:control:ebook:${id}`
      ])
    })
    .then(extractData);
}

export function deleteEbook({ token, id, signal } = {}) {
  assertToken(token, 'delete an e-book');
  assertId(id, 'E-book id');
  return httpClient
    .delete(`/admin/control/ebooks/${id}`, {
      token,
      signal,
      cache: createInvalidationConfig([
        CONTROL_CACHE_TAGS.ebooks,
        `admin:control:ebook:${id}`
      ])
    })
    .then(extractData);
}

export function listLiveStreams({ token, params, signal } = {}) {
  assertToken(token, 'list live streams');
  return httpClient
    .get('/admin/control/live-streams', {
      token,
      params,
      signal,
      cache: createListCacheConfig(CONTROL_CACHE_TAGS.liveStreams)
    })
    .then(normaliseList);
}

export function createLiveStream({ token, payload, signal } = {}) {
  assertToken(token, 'create a live stream');
  return httpClient
    .post('/admin/control/live-streams', payload, {
      token,
      signal,
      cache: createInvalidationConfig(CONTROL_CACHE_TAGS.liveStreams)
    })
    .then(extractData);
}

export function updateLiveStream({ token, id, payload, signal } = {}) {
  assertToken(token, 'update a live stream');
  assertId(id, 'Live stream id');
  return httpClient
    .put(`/admin/control/live-streams/${id}`, payload, {
      token,
      signal,
      cache: createInvalidationConfig([
        CONTROL_CACHE_TAGS.liveStreams,
        `admin:control:live-stream:${id}`
      ])
    })
    .then(extractData);
}

export function deleteLiveStream({ token, id, signal } = {}) {
  assertToken(token, 'delete a live stream');
  assertId(id, 'Live stream id');
  return httpClient
    .delete(`/admin/control/live-streams/${id}`, {
      token,
      signal,
      cache: createInvalidationConfig([
        CONTROL_CACHE_TAGS.liveStreams,
        `admin:control:live-stream:${id}`
      ])
    })
    .then(extractData);
}

export function listPodcastShows({ token, params, signal } = {}) {
  assertToken(token, 'list podcast shows');
  return httpClient
    .get('/admin/control/podcasts', {
      token,
      params,
      signal,
      cache: createListCacheConfig(CONTROL_CACHE_TAGS.podcasts)
    })
    .then(normaliseList);
}

export function createPodcastShow({ token, payload, signal } = {}) {
  assertToken(token, 'create a podcast show');
  return httpClient
    .post('/admin/control/podcasts', payload, {
      token,
      signal,
      cache: createInvalidationConfig(CONTROL_CACHE_TAGS.podcasts)
    })
    .then(extractData);
}

export function updatePodcastShow({ token, id, payload, signal } = {}) {
  assertToken(token, 'update a podcast show');
  assertId(id, 'Podcast show id');
  return httpClient
    .put(`/admin/control/podcasts/${id}`, payload, {
      token,
      signal,
      cache: createInvalidationConfig([
        CONTROL_CACHE_TAGS.podcasts,
        `admin:control:podcast:${id}`
      ])
    })
    .then(extractData);
}

export function deletePodcastShow({ token, id, signal } = {}) {
  assertToken(token, 'delete a podcast show');
  assertId(id, 'Podcast show id');
  return httpClient
    .delete(`/admin/control/podcasts/${id}`, {
      token,
      signal,
      cache: createInvalidationConfig([
        CONTROL_CACHE_TAGS.podcasts,
        `admin:control:podcast:${id}`
      ])
    })
    .then(extractData);
}

export function listPodcastEpisodes(showId, { token, params, signal } = {}) {
  assertToken(token, 'list podcast episodes');
  assertId(showId, 'Podcast show id');
  return httpClient
    .get(`/admin/control/podcasts/${showId}/episodes`, {
      token,
      params,
      signal,
      cache: createListCacheConfig(`admin:control:podcasts:${showId}:episodes`)
    })
    .then(normaliseList);
}

export function createPodcastEpisode(showId, { token, payload, signal } = {}) {
  assertToken(token, 'create a podcast episode');
  assertId(showId, 'Podcast show id');
  return httpClient
    .post(`/admin/control/podcasts/${showId}/episodes`, payload, {
      token,
      signal,
      cache: createInvalidationConfig([
        CONTROL_CACHE_TAGS.podcasts,
        `admin:control:podcasts:${showId}:episodes`
      ])
    })
    .then(extractData);
}

export function updatePodcastEpisode(showId, episodeId, { token, payload, signal } = {}) {
  assertToken(token, 'update a podcast episode');
  assertId(showId, 'Podcast show id');
  assertId(episodeId, 'Podcast episode id');
  return httpClient
    .put(`/admin/control/podcasts/${showId}/episodes/${episodeId}`, payload, {
      token,
      signal,
      cache: createInvalidationConfig([
        CONTROL_CACHE_TAGS.podcasts,
        `admin:control:podcasts:${showId}:episodes`,
        `admin:control:podcasts:${showId}:episode:${episodeId}`
      ])
    })
    .then(extractData);
}

export function deletePodcastEpisode(showId, episodeId, { token, signal } = {}) {
  assertToken(token, 'delete a podcast episode');
  assertId(showId, 'Podcast show id');
  assertId(episodeId, 'Podcast episode id');
  return httpClient
    .delete(`/admin/control/podcasts/${showId}/episodes/${episodeId}`, {
      token,
      signal,
      cache: createInvalidationConfig([
        CONTROL_CACHE_TAGS.podcasts,
        `admin:control:podcasts:${showId}:episodes`,
        `admin:control:podcasts:${showId}:episode:${episodeId}`
      ])
    })
    .then(extractData);
}

export function listAuditLog({ token, params, signal } = {}) {
  assertToken(token, 'list audit log entries');
  return httpClient
    .get('/admin/control/audit-log', {
      token,
      params,
      signal,
      cache: { enabled: false }
    })
    .then(normaliseAuditLog);
}

export function fetchOverview({ token, params, signal } = {}) {
  assertToken(token, 'load the admin control overview');
  return httpClient
    .get('/admin/control/overview', {
      token,
      params,
      signal,
      cache: { enabled: false }
    })
    .then(normaliseOverview);
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
  deletePodcastEpisode,
  listAuditLog,
  fetchOverview
};

export default adminControlApi;
