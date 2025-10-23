import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { fetchCourseProgress, updateCourseLessonProgress } from '../api/courseApi.js';
import { useAuth } from '../context/AuthContext.jsx';

const DEFAULT_OUTLINE = {
  enrollment: null,
  modules: [],
  totals: { lessonCount: 0, completedLessons: 0, progressPercent: 0 },
  certificate: null,
  achievement: null
};

export default function useLearnerProgress(courseSlug) {
  const { session } = useAuth();
  const token = session?.tokens?.accessToken ?? null;
  const [outline, setOutline] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [updatingLesson, setUpdatingLesson] = useState(null);
  const abortRef = useRef(null);

  const loadOutline = useCallback(async () => {
    if (!token || !courseSlug) {
      setOutline(null);
      return;
    }

    setLoading(true);
    setError(null);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetchCourseProgress(courseSlug, {
        token,
        signal: controller.signal
      });
      setOutline(response.data ?? DEFAULT_OUTLINE);
    } catch (fetchError) {
      if (fetchError.name === 'CanceledError' || fetchError.name === 'AbortError') {
        return;
      }
      setError(fetchError);
    } finally {
      setLoading(false);
    }
  }, [courseSlug, token]);

  useEffect(() => {
    loadOutline();
    return () => {
      abortRef.current?.abort();
    };
  }, [loadOutline]);

  const refresh = useCallback(() => loadOutline(), [loadOutline]);

  const updateLesson = useCallback(
    async (lessonSlug, payload = {}) => {
      if (!token || !courseSlug || !lessonSlug) {
        throw new Error('Course slug, lesson slug, and token are required to update progress');
      }
      setUpdatingLesson(lessonSlug);
      setError(null);

      try {
        const response = await updateCourseLessonProgress(courseSlug, lessonSlug, payload, { token });
        if (response?.data?.outline) {
          setOutline(response.data.outline);
        } else if (response?.data) {
          setOutline(response.data);
        }
        return response?.data ?? null;
      } catch (updateError) {
        setError(updateError);
        throw updateError;
      } finally {
        setUpdatingLesson(null);
      }
    },
    [courseSlug, token]
  );

  const computed = useMemo(() => outline ?? DEFAULT_OUTLINE, [outline]);

  return {
    outline: computed,
    loading,
    error,
    refresh,
    updatingLesson,
    updateLessonProgress: updateLesson
  };
}
