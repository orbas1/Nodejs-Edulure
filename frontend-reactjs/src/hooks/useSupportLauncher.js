import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { searchSupportKnowledgeBase } from '../api/learnerDashboardApi.js';
import { useAuth } from '../context/AuthContext.jsx';

const STORAGE_NAMESPACE = 'edulure.support.launcher.v1';
const DEFAULT_STORAGE_STATE = Object.freeze({ helpful: [], feedbackHistory: [] });
const DEFAULT_METRICS = Object.freeze({
  open: 0,
  awaitingLearner: 0,
  resolved: 0,
  averageResponseMinutes: 0,
  csat: null
});

function normaliseArticle(article, fallbackId) {
  if (!article) {
    return null;
  }
  const id = article.id ?? article.slug ?? fallbackId;
  if (!id) {
    return null;
  }
  const minutesRaw = article.minutes ?? article.readTime ?? article.durationMinutes;
  const minutes = Number.isFinite(Number(minutesRaw)) ? Math.max(1, Math.round(Number(minutesRaw))) : 3;
  return {
    id,
    title: article.title ?? article.name ?? 'Support article',
    excerpt:
      article.excerpt ??
      article.summary ??
      article.description ??
      'Explore the detailed playbook to resolve common learner and instructor requests.',
    url: article.url ?? article.href ?? '#',
    category: article.category ?? article.topic ?? 'Guide',
    minutes
  };
}

function normaliseArticles(list) {
  if (!Array.isArray(list)) {
    return [];
  }
  const map = new Map();
  list.forEach((item, index) => {
    const normalised = normaliseArticle(item, `kb-${index}`);
    if (!normalised) {
      return;
    }
    if (!map.has(normalised.id)) {
      map.set(normalised.id, normalised);
      return;
    }
    const existing = map.get(normalised.id);
    map.set(normalised.id, {
      ...existing,
      ...normalised,
      minutes: Number.isFinite(normalised.minutes) ? normalised.minutes : existing.minutes
    });
  });
  return Array.from(map.values());
}

function normaliseCaseSummary(caseItem) {
  if (!caseItem) {
    return null;
  }
  const id = caseItem.id ?? caseItem.caseId ?? caseItem.ticketId;
  if (!id) {
    return null;
  }
  const status = (caseItem.status ?? caseItem.state ?? 'open').toString().toLowerCase();
  const priority = (caseItem.priority ?? 'normal').toString().toLowerCase();
  return {
    id,
    subject: caseItem.subject ?? caseItem.title ?? 'Support request',
    status,
    priority,
    updatedAt: caseItem.updatedAt ?? caseItem.lastMessageAt ?? caseItem.updated ?? null,
    slaStatus: caseItem.slaStatus ?? caseItem.sla_status ?? null,
    channel: caseItem.channel ?? caseItem.source ?? 'portal'
  };
}

function normaliseMetrics(metrics) {
  if (!metrics || typeof metrics !== 'object') {
    return DEFAULT_METRICS;
  }
  const open = Number(metrics.open ?? metrics.openTickets ?? 0);
  const awaiting = Number(metrics.awaitingLearner ?? metrics.waiting ?? metrics.awaiting ?? 0);
  const resolved = Number(metrics.resolved ?? metrics.closed ?? 0);
  const averageResponseMinutes = Number(metrics.averageResponseMinutes ?? metrics.avgResponse ?? 0);
  const csat = metrics.csat ?? metrics.csatScore ?? metrics.csatPercent ?? null;
  return {
    open: Number.isFinite(open) ? open : 0,
    awaitingLearner: Number.isFinite(awaiting) ? awaiting : 0,
    resolved: Number.isFinite(resolved) ? resolved : 0,
    averageResponseMinutes: Number.isFinite(averageResponseMinutes)
      ? Math.max(0, Math.round(averageResponseMinutes))
      : 0,
    csat: typeof csat === 'number' ? Math.max(0, Math.min(100, Math.round(csat))) : null
  };
}

function getStorageKey(userId) {
  const suffix = userId ? userId.toString().toLowerCase() : 'anonymous';
  return `${STORAGE_NAMESPACE}:${suffix}`;
}

function readStoredState(storageKey) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { ...DEFAULT_STORAGE_STATE };
  }
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return { ...DEFAULT_STORAGE_STATE };
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return { ...DEFAULT_STORAGE_STATE };
    }
    const helpful = Array.isArray(parsed.helpful)
      ? parsed.helpful.filter((item) => typeof item === 'string')
      : [];
    const feedbackHistory = Array.isArray(parsed.feedbackHistory) ? parsed.feedbackHistory : [];
    return { helpful, feedbackHistory };
  } catch (error) {
    console.error('Failed to read support launcher state', error);
    return { ...DEFAULT_STORAGE_STATE };
  }
}

function persistStoredState(storageKey, state) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to persist support launcher state', error);
  }
}

export default function useSupportLauncher(options = {}) {
  const { seedArticles = [], seedSuggestions = [], metrics: metricsInput = {}, recentCases = [] } = options;
  const location = useLocation();
  const { session } = useAuth();
  const token = session?.tokens?.accessToken ?? null;
  const userId = session?.user?.id ?? 'anonymous';
  const storageKey = useMemo(() => getStorageKey(userId), [userId]);

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [searchResults, setSearchResults] = useState(() => normaliseArticles(seedArticles));
  const [storageState, setStorageState] = useState(() => readStoredState(storageKey));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [feedbackPending, setFeedbackPending] = useState(false);

  useEffect(() => {
    setStorageState(readStoredState(storageKey));
  }, [storageKey]);

  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setLoading(false);
      return undefined;
    }
    if (!token) {
      setError(null);
      return undefined;
    }
    const controller = new AbortController();
    const trimmedQuery = query.trim();
    const activeCategory = category === 'all' ? undefined : category;
    setLoading(true);
    setError(null);
    const timeout = setTimeout(() => {
      searchSupportKnowledgeBase({
        token,
        query: trimmedQuery,
        category: activeCategory,
        signal: controller.signal
      })
        .then((response) => {
          const payload = response?.data ?? response;
          const articles = Array.isArray(payload?.articles)
            ? payload.articles
            : Array.isArray(payload?.data?.articles)
              ? payload.data.articles
              : [];
          setSearchResults(normaliseArticles(articles));
        })
        .catch((requestError) => {
          if (controller.signal.aborted) {
            return;
          }
          const normalisedError =
            requestError instanceof Error
              ? requestError
              : new Error('Failed to load support knowledge content');
          setError(normalisedError);
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setLoading(false);
          }
        });
    }, 220);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [category, isOpen, query, token]);

  const metrics = useMemo(() => normaliseMetrics(metricsInput), [metricsInput]);

  const helpfulArticleIds = useMemo(() => new Set(storageState.helpful), [storageState.helpful]);

  const suggestions = useMemo(() => {
    const combined = [...normaliseArticles(seedSuggestions), ...searchResults];
    return normaliseArticles(combined);
  }, [seedSuggestions, searchResults]);

  const deflectionRate = useMemo(() => {
    if (!suggestions.length) {
      return 0;
    }
    const helpfulCount = helpfulArticleIds.size;
    return Math.min(100, Math.round((helpfulCount / suggestions.length) * 100));
  }, [helpfulArticleIds.size, suggestions.length]);

  const caseSummaries = useMemo(
    () => recentCases.map((item) => normaliseCaseSummary(item)).filter(Boolean),
    [recentCases]
  );

  const toggleHelpfulArticle = useCallback(
    (articleId) => {
      if (!articleId) {
        return;
      }
      setStorageState((prev) => {
        const nextHelpful = new Set(prev.helpful);
        if (nextHelpful.has(articleId)) {
          nextHelpful.delete(articleId);
        } else {
          nextHelpful.add(articleId);
        }
        const updated = { ...prev, helpful: Array.from(nextHelpful) };
        persistStoredState(storageKey, updated);
        return updated;
      });
    },
    [storageKey]
  );

  const submitFeedback = useCallback(
    async ({ rating, comment } = {}) => {
      const numericRating = Number.isFinite(Number(rating)) ? Math.max(1, Math.min(5, Number(rating))) : null;
      const trimmedComment = typeof comment === 'string' ? comment.trim() : '';
      setFeedbackPending(true);
      try {
        await new Promise((resolve) => setTimeout(resolve, 320));
        const entry = {
          id: `feedback-${Date.now()}`,
          rating: numericRating,
          comment: trimmedComment,
          submittedAt: new Date().toISOString(),
          context: {
            path: location.pathname,
            query,
            category,
            role: session?.user?.role ?? null
          }
        };
        setStorageState((prev) => {
          const history = [entry, ...prev.feedbackHistory].slice(0, 5);
          const updated = { ...prev, feedbackHistory: history };
          persistStoredState(storageKey, updated);
          return updated;
        });
        return entry;
      } finally {
        setFeedbackPending(false);
      }
    },
    [category, location.pathname, query, session?.user?.role, storageKey]
  );

  const context = useMemo(
    () => ({
      path: location.pathname,
      segments: location.pathname.split('/').filter(Boolean),
      role: session?.user?.role ?? null,
      userId,
      metrics,
      lastFeedback: storageState.feedbackHistory[0] ?? null
    }),
    [location.pathname, metrics, session?.user?.role, storageState.feedbackHistory, userId]
  );

  const openLauncher = useCallback(() => setIsOpen(true), []);
  const closeLauncher = useCallback(() => setIsOpen(false), []);
  const toggleLauncher = useCallback(() => setIsOpen((prev) => !prev), []);

  return {
    isOpen,
    openLauncher,
    closeLauncher,
    toggleLauncher,
    query,
    setQuery,
    category,
    setCategory,
    suggestions,
    helpfulArticleIds,
    toggleHelpfulArticle,
    metrics,
    deflectionRate,
    loading,
    error,
    feedbackHistory: storageState.feedbackHistory,
    submitFeedback,
    feedbackPending,
    context,
    caseSummaries
  };
}
