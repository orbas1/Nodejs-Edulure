import { useCallback, useEffect, useMemo } from 'react';

import { useAuth } from '../context/AuthContext.jsx';
import usePersistentCollection from './usePersistentCollection.js';

const STORAGE_NAMESPACE = 'edulure.dashboard.studyPlan.v1';

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit'
});

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric'
});

function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

function toISOString(value) {
  const date = toDate(value);
  return date ? date.toISOString() : null;
}

function parseDurationMinutes(value) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.round(value);
  }
  if (typeof value === 'string') {
    const normalised = value.trim();
    if (!normalised) {
      return null;
    }
    const hoursMatch = normalised.match(/(\d+(?:\.\d+)?)\s*(h|hr|hour|hours)/i);
    const minutesMatch = normalised.match(/(\d+(?:\.\d+)?)\s*(m|min|minute|minutes)/i);
    let minutes = 0;
    if (hoursMatch) {
      minutes += Number.parseFloat(hoursMatch[1]) * 60;
    }
    if (minutesMatch) {
      minutes += Number.parseFloat(minutesMatch[1]);
    }
    if (!minutes && /^\d+$/.test(normalised)) {
      minutes = Number.parseInt(normalised, 10);
    }
    if (Number.isFinite(minutes) && minutes > 0) {
      return Math.round(minutes);
    }
  }
  return null;
}

function formatDuration(minutes) {
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return 'Scheduled block';
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours && remainingMinutes) {
    return `${hours}h ${remainingMinutes}m`;
  }
  if (hours) {
    return `${hours}h`;
  }
  return `${remainingMinutes}m`;
}

function deriveWindowLabel(startAt, endAt) {
  const start = toDate(startAt);
  const end = toDate(endAt);
  if (start && end) {
    return `${DATE_TIME_FORMATTER.format(start)} → ${DATE_TIME_FORMATTER.format(end)}`;
  }
  if (start) {
    return DATE_TIME_FORMATTER.format(start);
  }
  if (end) {
    return DATE_TIME_FORMATTER.format(end);
  }
  return 'Flexible window';
}

function normaliseStudyBlock(block) {
  if (!block) {
    return null;
  }
  const startAt = toISOString(block.startAt ?? block.start ?? block.windowStart);
  const endAt = toISOString(block.endAt ?? block.end ?? block.windowEnd);
  const durationCandidates = [
    block.durationMinutes,
    block.duration,
    block.minutes,
    block.studyMinutes,
    block.totalMinutes
  ];
  let durationMinutes = durationCandidates
    .map((candidate) => parseDurationMinutes(candidate))
    .find((value) => Number.isFinite(value) && value > 0);
  if (!durationMinutes) {
    const start = toDate(startAt);
    const end = toDate(endAt);
    if (start && end) {
      durationMinutes = Math.max(30, Math.round((end.getTime() - start.getTime()) / (60 * 1000)));
    } else {
      durationMinutes = 60;
    }
  }

  const materials = Array.isArray(block.materials)
    ? block.materials
    : typeof block.materials === 'string'
      ? block.materials
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      : Array.isArray(block.resources)
        ? block.resources
        : block.resources && typeof block.resources === 'string'
          ? block.resources
              .split(',')
              .map((item) => item.trim())
              .filter(Boolean)
          : [];

  return {
    id: block.id ?? null,
    focus: block.focus ?? block.title ?? 'Deep work block',
    course: block.course ?? block.program ?? block.subject ?? null,
    startAt,
    endAt,
    durationMinutes,
    mode: block.mode ?? block.modality ?? 'Deep work',
    materials,
    submissionUrl: block.submissionUrl ?? block.link ?? null,
    status: block.status === 'completed' ? 'completed' : 'scheduled',
    notes: block.notes ?? block.description ?? ''
  };
}

function enrichStudyBlock(block) {
  const windowLabel = deriveWindowLabel(block.startAt, block.endAt);
  const durationLabel = formatDuration(block.durationMinutes);
  const startDate = toDate(block.startAt);
  const dayLabel = startDate ? DATE_FORMATTER.format(startDate) : 'Unscheduled';
  return {
    ...block,
    windowLabel,
    durationLabel,
    dayLabel
  };
}

export default function useLearnerStudyPlan(initialPlan = [], options = {}) {
  const { session: sessionOverride, userId: userIdOverride } = options;
  const auth = sessionOverride ? null : useAuth();
  const session = sessionOverride ?? auth?.session ?? null;
  const userId = userIdOverride ?? session?.user?.id ?? 'anonymous';
  const storageKey = `${STORAGE_NAMESPACE}:${userId}`;

  const initialisedPlan = useMemo(() => {
    if (!Array.isArray(initialPlan)) {
      return [];
    }
    return initialPlan
      .map((block) => normaliseStudyBlock(block))
      .filter(Boolean)
      .map((block) => ({
        ...block,
        id: block.id ?? undefined
      }));
  }, [initialPlan]);

  const { items, addItem, updateItem, removeItem, reset, replaceItems } = usePersistentCollection(
    storageKey,
    initialisedPlan
  );

  useEffect(() => {
    if (!Array.isArray(initialPlan) || initialPlan.length === 0) {
      return;
    }
    const remoteIds = new Set(initialPlan.map((entry) => entry?.id).filter(Boolean));
    const needsMerge = initialPlan.some((entry) => !items.some((item) => item.id === entry.id));
    if (needsMerge) {
      const merged = [
        ...items,
        ...initialPlan
          .filter((entry) => entry?.id && !items.some((item) => item.id === entry.id))
          .map((entry) => normaliseStudyBlock(entry))
      ];
      replaceItems(merged);
    } else if (remoteIds.size && items.some((item) => remoteIds.has(item.id))) {
      const refreshed = items.map((item) => {
        if (!remoteIds.has(item.id)) {
          return item;
        }
        const remote = initialPlan.find((entry) => entry?.id === item.id);
        return normaliseStudyBlock({ ...item, ...remote, id: item.id });
      });
      replaceItems(refreshed);
    }
  }, [initialPlan, items, replaceItems]);

  const plan = useMemo(() => items.map((item) => enrichStudyBlock(normaliseStudyBlock(item))), [items]);

  const stats = useMemo(() => {
    const now = Date.now();
    let completed = 0;
    let scheduled = 0;
    let totalMinutes = 0;
    let upcomingMinutes = 0;
    let nextBlock = null;

    plan.forEach((block) => {
      totalMinutes += block.durationMinutes ?? 0;
      const start = toDate(block.startAt);
      if (block.status === 'completed') {
        completed += 1;
        return;
      }
      scheduled += 1;
      if (start && start.getTime() >= now) {
        upcomingMinutes += block.durationMinutes ?? 0;
        if (!nextBlock || start < toDate(nextBlock.startAt)) {
          nextBlock = block;
        }
      }
    });

    return {
      completed,
      scheduled,
      totalMinutes,
      upcomingMinutes,
      nextBlockId: nextBlock?.id ?? null
    };
  }, [plan]);

  const createBlock = useCallback(
    (payload) => {
      const timestamp = new Date().toISOString();
      const normalised = normaliseStudyBlock({
        ...payload,
        status: payload.status ?? 'scheduled',
        startAt: payload.startAt ?? payload.windowStart ?? payload.start,
        endAt: payload.endAt ?? payload.windowEnd ?? payload.end,
        notes: payload.notes,
        materials: payload.materials
      });
      const record = {
        ...normalised,
        createdAt: timestamp,
        updatedAt: timestamp
      };
      return addItem(record);
    },
    [addItem]
  );

  const updateBlock = useCallback(
    (id, updates) => {
      updateItem(id, (current) => {
        const next = normaliseStudyBlock({ ...current, ...updates, id });
        return {
          ...current,
          ...next,
          updatedAt: new Date().toISOString()
        };
      });
    },
    [updateItem]
  );

  const removeBlock = useCallback((id) => {
    removeItem(id);
  }, [removeItem]);

  const toggleCompletion = useCallback(
    (id) => {
      updateItem(id, (current) => ({
        ...current,
        status: current.status === 'completed' ? 'scheduled' : 'completed',
        completedAt: current.status === 'completed' ? null : new Date().toISOString()
      }));
    },
    [updateItem]
  );

  const duplicateBlock = useCallback(
    (id) => {
      const source = plan.find((block) => block.id === id);
      if (!source) {
        return null;
      }
      const start = toDate(source.startAt);
      const end = toDate(source.endAt);
      const offset = 7 * 24 * 60 * 60 * 1000;
      const payload = {
        ...source,
        id: undefined,
        status: 'scheduled',
        startAt: start ? new Date(start.getTime() + offset).toISOString() : null,
        endAt: end ? new Date(end.getTime() + offset).toISOString() : null
      };
      return createBlock(payload);
    },
    [plan, createBlock]
  );

  const resetPlan = useCallback(() => {
    reset();
  }, [reset]);

  return {
    plan,
    stats,
    createBlock,
    updateBlock,
    removeBlock,
    toggleCompletion,
    duplicateBlock,
    reset: resetPlan
  };
}
