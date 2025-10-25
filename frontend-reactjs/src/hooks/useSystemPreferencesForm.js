import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  fetchSystemPreferences,
  updateSystemPreferences
} from '../api/learnerDashboardApi.js';

export const SUPPORTED_LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'French' },
  { value: 'es', label: 'Spanish' },
  { value: 'de', label: 'German' },
  { value: 'pt', label: 'Portuguese' }
];

export const SUPPORTED_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Africa/Lagos',
  'Asia/Singapore',
  'Australia/Sydney'
];

export const INTERFACE_DENSITIES = [
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'compact', label: 'Compact' },
  { value: 'expanded', label: 'Expanded' }
];

const DEFAULT_RECOMMENDED_TOPICS = Object.freeze([
  'community-building',
  'learner-success',
  'automation'
]);

export const FALLBACK_RECOMMENDATION_PREVIEW = Object.freeze([
  {
    id: 'course-async-leadership',
    title: 'Design async learning rituals',
    category: 'Course',
    descriptor: 'Course • 6 lessons',
    imageUrl: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'community-cohort-kickoff',
    title: 'Launch your next cohort with confidence',
    category: 'Playbook',
    descriptor: 'Guide • 12 steps',
    imageUrl: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'ops-automation',
    title: 'Automate learner check-ins',
    category: 'Workflow',
    descriptor: 'Automation • 4 rules',
    imageUrl: 'https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&w=900&q=80'
  }
]);

export const ADS_DATA_USAGE_COPY =
  'Edulure Ads only uses engagement trends inside your academy to match sponsored resources. Disable personalisation to limit sponsors to broad categories.';

export const DEFAULT_SYSTEM_FORM = {
  language: 'en',
  region: 'US',
  timezone: 'UTC',
  notificationsEnabled: true,
  digestEnabled: true,
  autoPlayMedia: false,
  highContrast: false,
  reducedMotion: false,
  preferences: {
    interfaceDensity: 'comfortable',
    analyticsOptIn: true,
    subtitleLanguage: 'en',
    audioDescription: false,
    adPersonalisation: true,
    sponsoredHighlights: true,
    adDataUsageAcknowledged: false,
    recommendedTopics: DEFAULT_RECOMMENDED_TOPICS,
    recommendationPreview: []
  }
};

export function normaliseRecommendedTopics(value) {
  if (!value) {
    return [...DEFAULT_RECOMMENDED_TOPICS];
  }
  if (Array.isArray(value)) {
    return value
      .map((topic) => String(topic ?? '').trim())
      .filter((topic) => topic.length > 0)
      .slice(0, 6);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
      .slice(0, 6);
  }
  return [...DEFAULT_RECOMMENDED_TOPICS];
}

export function normaliseRecommendationPreview(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item, index) => ({
      id: item?.id ?? `recommendation-${index}`,
      title: item?.title ?? 'Recommended resource',
      category: item?.category ?? item?.type ?? 'Course',
      descriptor: item?.descriptor ?? item?.subtitle ?? '',
      imageUrl: item?.imageUrl ?? item?.coverImage ?? '',
      route: item?.route ?? item?.href ?? null
    }))
    .filter((item) => Boolean(item.id) && Boolean(item.title))
    .slice(0, 6);
}

export default function useSystemPreferencesForm({ token, onStatus, onAfterSave } = {}) {
  const [form, setForm] = useState(DEFAULT_SYSTEM_FORM);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetchedAt, setLastFetchedAt] = useState(null);
  const [lastSavedAt, setLastSavedAt] = useState(null);

  const applyPayload = useCallback((payload) => {
    if (!payload) return;
    const preferencesFromPayload = payload.preferences ?? {};
    setForm({
      ...DEFAULT_SYSTEM_FORM,
      ...payload,
      preferences: {
        ...DEFAULT_SYSTEM_FORM.preferences,
        ...preferencesFromPayload,
        recommendedTopics: normaliseRecommendedTopics(preferencesFromPayload.recommendedTopics),
        recommendationPreview: normaliseRecommendationPreview(
          preferencesFromPayload.recommendationPreview
        )
      }
    });
  }, []);

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await fetchSystemPreferences({ token });
      if (response?.data) {
        applyPayload(response.data);
        if (response.data.updatedAt) {
          const updated = new Date(response.data.updatedAt);
          setLastFetchedAt(Number.isNaN(updated.getTime()) ? new Date() : updated);
        } else {
          setLastFetchedAt(new Date());
        }
      }
      setError(null);
    } catch (refreshError) {
      const errorToSet =
        refreshError instanceof Error
          ? refreshError
          : new Error('Unable to load system preferences.');
      setError(errorToSet);
    } finally {
      setLoading(false);
    }
  }, [applyPayload, token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const persist = useCallback(async () => {
    if (!token) {
      const errorToThrow = new Error('Sign in again to update your preferences.');
      onStatus?.({ type: 'error', message: errorToThrow.message });
      throw errorToThrow;
    }
    setSaving(true);
    onStatus?.({ type: 'pending', message: 'Saving system preferences…' });
    try {
      const preferencesPayload = { ...form.preferences };
      delete preferencesPayload.recommendationPreview;
      await updateSystemPreferences({
        token,
        payload: {
          language: form.language,
          region: form.region,
          timezone: form.timezone,
          notificationsEnabled: form.notificationsEnabled,
          digestEnabled: form.digestEnabled,
          autoPlayMedia: form.autoPlayMedia,
          highContrast: form.highContrast,
          reducedMotion: form.reducedMotion,
          preferences: {
            ...preferencesPayload,
            recommendedTopics: normaliseRecommendedTopics(preferencesPayload.recommendedTopics),
            adDataUsageAcknowledged: preferencesPayload.adPersonalisation
              ? true
              : Boolean(preferencesPayload.adDataUsageAcknowledged)
          }
        }
      });
      await refresh();
      setLastSavedAt(new Date());
      onAfterSave?.();
      onStatus?.({ type: 'success', message: 'System preferences updated.' });
    } catch (persistError) {
      const message =
        persistError instanceof Error
          ? persistError.message
          : 'We could not update your system preferences. Please try again.';
      onStatus?.({ type: 'error', message });
      throw persistError;
    } finally {
      setSaving(false);
    }
  }, [form, onAfterSave, onStatus, refresh, token]);

  const handleInputChange = useCallback((event) => {
    const { name, type, checked, value } = event.target;
    if (name.startsWith('preferences.')) {
      const key = name.split('.')[1];
      if (key === 'recommendedTopics') {
        setForm((previous) => ({
          ...previous,
          preferences: {
            ...previous.preferences,
            recommendedTopics: normaliseRecommendedTopics(value)
          }
        }));
        return;
      }
      setForm((previous) => ({
        ...previous,
        preferences: {
          ...previous.preferences,
          [key]: type === 'checkbox' ? checked : value
        }
      }));
      return;
    }
    setForm((previous) => ({
      ...previous,
      [name]: type === 'checkbox' ? checked : value
    }));
  }, []);

  const updateSystemToggle = useCallback((field, nextValue) => {
    setForm((previous) => ({
      ...previous,
      [field]: Boolean(nextValue)
    }));
  }, []);

  const updatePreferenceToggle = useCallback((field, nextValue) => {
    setForm((previous) => ({
      ...previous,
      preferences: {
        ...previous.preferences,
        [field]: Boolean(nextValue)
      }
    }));
  }, []);

  const handleAdPersonalisationChange = useCallback((nextValue) => {
    setForm((previous) => ({
      ...previous,
      preferences: {
        ...previous.preferences,
        adPersonalisation: Boolean(nextValue),
        adDataUsageAcknowledged: nextValue ? true : false
      }
    }));
  }, []);

  const acknowledgeAdsCopy = useCallback(() => {
    setForm((previous) => ({
      ...previous,
      preferences: {
        ...previous.preferences,
        adDataUsageAcknowledged: true
      }
    }));
  }, []);

  const recommendationPreview = useMemo(() => {
    const previewItems = form.preferences?.recommendationPreview ?? [];
    if (Array.isArray(previewItems) && previewItems.length > 0) {
      return previewItems;
    }
    return FALLBACK_RECOMMENDATION_PREVIEW;
  }, [form.preferences?.recommendationPreview]);

  const recommendedTopicsInputValue = useMemo(() => {
    const topics = form.preferences?.recommendedTopics ?? [];
    return Array.isArray(topics) ? topics.join(', ') : '';
  }, [form.preferences?.recommendedTopics]);

  const adPersonalisationEnabled = useMemo(
    () => Boolean(form.preferences?.adPersonalisation),
    [form.preferences?.adPersonalisation]
  );

  return {
    form,
    setForm,
    loading,
    saving,
    error,
    lastFetchedAt,
    lastSavedAt,
    refresh,
    persist,
    handleInputChange,
    updateSystemToggle,
    updatePreferenceToggle,
    handleAdPersonalisationChange,
    acknowledgeAdsCopy,
    recommendationPreview,
    recommendedTopicsInputValue,
    adPersonalisationEnabled
  };
}
