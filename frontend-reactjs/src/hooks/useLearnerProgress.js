import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { fetchLearnerCourseProgress } from '../api/learnerDashboardApi.js';
import { useAuth } from '../context/AuthContext.jsx';
import useMountedRef from './useMountedRef.js';

const STORAGE_KEY = 'edulure:learner-progress:v1';
const STALE_THRESHOLD_MS = 5 * 60 * 1000;

function loadCachedProgress() {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
  } catch (_error) {
    return null;
  }
  return null;
}

function persistProgress(payload) {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (_error) {
    // Ignore storage errors; progress can be re-fetched later.
  }
}

function normaliseProgressPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return {
      courseSummaries: [],
      lessons: [],
      enrollments: [],
      generatedAt: new Date().toISOString()
    };
  }
  const courseSummaries = Array.isArray(payload.courseSummaries)
    ? payload.courseSummaries
    : [];
  const lessons = Array.isArray(payload.lessons) ? payload.lessons : [];
  const enrollments = Array.isArray(payload.enrollments) ? payload.enrollments : [];
  const generatedAt = payload.generatedAt ?? new Date().toISOString();
  return {
    courseSummaries,
    lessons,
    enrollments,
    generatedAt
  };
}

export default function useLearnerProgress(courseId, { refreshOnMount = true } = {}) {
  const { session } = useAuth();
  const mountedRef = useMountedRef();
  const controllerRef = useRef(null);
  const token = session?.tokens?.accessToken;
  const [state, setState] = useState(() => {
    const cached = loadCachedProgress();
    if (!cached) {
      return {
        data: normaliseProgressPayload(null),
        loading: false,
        error: null,
        source: 'initial'
      };
    }
    return {
      data: normaliseProgressPayload(cached),
      loading: false,
      error: null,
      source: 'cache'
    };
  });

  const loadProgress = useCallback(
    async (options = {}) => {
      if (!token) {
        setState({
          data: normaliseProgressPayload(null),
          loading: false,
          error: null,
          source: 'unauthenticated'
        });
        return null;
      }
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
      const controller = new AbortController();
      controllerRef.current = controller;
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const payload = await fetchLearnerCourseProgress({
          token,
          signal: controller.signal,
          ...options
        });
        const data = normaliseProgressPayload(payload);
        if (mountedRef.current) {
          setState({ data, loading: false, error: null, source: 'network' });
          persistProgress(data);
        }
        return data;
      } catch (error) {
        if (mountedRef.current && !controller.signal.aborted) {
          const normalised = error instanceof Error ? error : new Error('Unable to load course progress');
          setState((prev) => ({
            ...prev,
            loading: false,
            error: normalised,
            source: prev.source ?? 'cache'
          }));
        }
        return null;
      } finally {
        if (controllerRef.current === controller) {
          controllerRef.current = null;
        }
      }
    },
    [mountedRef, token]
  );

  useEffect(() => {
    if (!refreshOnMount) {
      return undefined;
    }
    if (!token) {
      setState({
        data: normaliseProgressPayload(null),
        loading: false,
        error: null,
        source: 'unauthenticated'
      });
      return undefined;
    }
    loadProgress();
    return () => {
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
    };
  }, [token, refreshOnMount, loadProgress]);

  const summariesByCourse = useMemo(() => {
    const map = new Map();
    state.data.courseSummaries.forEach((summary) => {
      if (summary?.courseId) {
        map.set(summary.courseId, summary);
      }
    });
    return map;
  }, [state.data.courseSummaries]);

  const selectedSummary = useMemo(() => {
    if (!courseId) {
      return null;
    }
    return summariesByCourse.get(courseId) ?? null;
  }, [courseId, summariesByCourse]);

  const getCourseSummary = useCallback(
    (id) => summariesByCourse.get(id ?? null) ?? null,
    [summariesByCourse]
  );

  const lastUpdatedAt = useMemo(() => {
    if (!state.data.generatedAt) {
      return null;
    }
    const date = new Date(state.data.generatedAt);
    return Number.isNaN(date.getTime()) ? null : date;
  }, [state.data.generatedAt]);

  const stale = useMemo(() => {
    if (!lastUpdatedAt) {
      return false;
    }
    const diff = Date.now() - lastUpdatedAt.getTime();
    return Number.isFinite(diff) && diff > STALE_THRESHOLD_MS;
  }, [lastUpdatedAt]);

  return {
    progress: courseId ? selectedSummary : state.data.courseSummaries,
    lessons: state.data.lessons,
    enrollments: state.data.enrollments,
    loading: state.loading,
    error: state.error,
    refresh: loadProgress,
    getCourseSummary,
    stale,
    lastUpdatedAt: lastUpdatedAt ? lastUpdatedAt.toISOString() : null,
    source: state.source ?? 'initial'
  };
}
