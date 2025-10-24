import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

import { fetchCoursePlayer, fetchCourseLiveChat, postCourseLiveChat } from '../../api/courseApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useRealtime } from '../../context/RealtimeContext.jsx';
import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import DashboardSwitcherHeader from '../../components/dashboard/DashboardSwitcherHeader.jsx';
import CourseProgressBar from '../../components/course/CourseProgressBar.jsx';
import { CourseModuleNavigator } from '../../components/course/CourseModuleNavigator.jsx';
import CertificatePreview from '../../components/certification/CertificatePreview.jsx';
import AssessmentQuickView from '../../components/course/AssessmentQuickView.jsx';
import { useLearnerDashboardContext } from '../../hooks/useLearnerDashboard.js';
import useDashboardSurface from '../../hooks/useDashboardSurface.js';
import useLearnerProgress from '../../hooks/useLearnerProgress.js';
import {
  formatDashboardDate,
  formatDashboardDateTime,
  formatDashboardRelative,
  getDashboardUrgency,
  parseDashboardDate
} from '../../utils/dashboardFormatting.js';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const determineScheduleTone = (date) => {
  const urgency = getDashboardUrgency(date);
  if (urgency === 'overdue') return 'text-red-600';
  if (urgency === 'soon') return 'text-amber-500';
  if (urgency === 'future') return 'text-emerald-600';
  return 'text-slate-400';
};

const formatRelativeDayLabel = (value) => {
  const relative = formatDashboardRelative(value, { numeric: 'auto' });
  if (!relative) {
    return 'Date pending';
  }
  return relative.charAt(0).toUpperCase() + relative.slice(1);
};

const resolveLessonType = (lesson) => {
  const metadata = lesson?.metadata ?? {};
  const candidates = [lesson?.type, metadata.type, metadata.lessonType, metadata.category];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim().toLowerCase();
    }
  }

  const tags = Array.isArray(metadata.tags)
    ? metadata.tags.map((tag) => String(tag).toLowerCase())
    : [];
  if (tags.includes('assessment') || tags.includes('quiz')) return 'assessment';
  if (tags.includes('exam')) return 'exam';
  if (tags.includes('assignment') || tags.includes('project')) return 'assignment';
  if (tags.includes('refresher') || tags.includes('recap')) return 'refresher';
  if (tags.includes('live') || tags.includes('live-class')) return 'live-class';
  if (tags.includes('report')) return 'report';
  if (tags.includes('catalog') || tags.includes('catalogue')) return 'catalogue';
  if (tags.includes('drip')) return 'drip';

  const title = (lesson?.title ?? '').toLowerCase();
  if (title.includes('assessment') || title.includes('quiz') || title.includes('checkpoint')) return 'assessment';
  if (title.includes('exam') || title.includes('final') || title.includes('test')) return 'exam';
  if (title.includes('assignment') || title.includes('project') || title.includes('capstone')) return 'assignment';
  if (title.includes('refresher') || title.includes('recap') || title.includes('review')) return 'refresher';
  if (title.includes('live') || title.includes('workshop') || title.includes('session') || title.includes('webinar')) {
    return 'live-class';
  }
  if (title.includes('report') || title.includes('analysis') || title.includes('insight')) return 'report';
  if (title.includes('catalogue') || title.includes('catalog')) return 'catalogue';
  if (metadata.dripRelease || metadata.drip === true) return 'drip';
  return 'lesson';
};

const formatLessonTypeLabel = (type) => {
  switch (type) {
    case 'assessment':
      return 'Assessment';
    case 'assignment':
      return 'Assignment';
    case 'exam':
      return 'Exam';
    case 'quiz':
      return 'Quiz';
    case 'live-class':
      return 'Live class';
    case 'refresher':
      return 'Refresher';
    case 'report':
      return 'Report';
    case 'catalogue':
      return 'Catalogue';
    case 'drip':
      return 'Drip release';
    case 'recording-review':
      return 'Recording';
    default:
      return 'Lesson';
  }
};

const selectPlaybackSources = (playback) => {
  if (!playback) return [];
  if (Array.isArray(playback.variants) && playback.variants.length) {
    return playback.variants
      .slice()
      .sort((a, b) => (a.bandwidth ?? a.bitrate ?? 0) - (b.bandwidth ?? b.bitrate ?? 0))
      .map((variant, index) => ({
        url: variant.url,
        mimeType: variant.mimeType ?? playback.mimeType ?? 'video/mp4',
        label:
          variant.label ??
          (variant.height ? `${variant.height}p` : variant.bandwidth ? `${Math.round(variant.bandwidth / 1000)}kbps` : `Source ${index + 1}`)
      }));
  }
  if (playback.url) {
    const compressedUrl = playback.url.includes('?')
      ? `${playback.url}&quality=medium`
      : `${playback.url}?quality=medium`;
    return [
      {
        url: compressedUrl,
        mimeType: playback.mimeType ?? 'video/mp4',
        label: playback.label ?? 'Adaptive'
      }
    ];
  }
  return [];
};

const resolvePlaybackPoster = (course, playback) => {
  if (playback?.posterUrl) return playback.posterUrl;
  if (playback?.previewImageUrl) return playback.previewImageUrl;
  if (course?.heroImageUrl) return course.heroImageUrl;
  if (course?.thumbnailUrl) return course.thumbnailUrl;
  return undefined;
};

const normaliseFallbackModules = (modules = []) =>
  modules.map((module) => {
    const lessons = Array.isArray(module.lessons) ? module.lessons : [];
    const normalisedLessons = lessons.map((lesson) => {
      const releaseDate = parseDashboardDate(lesson.releaseAt ?? lesson.availableAt);
      return {
        id: lesson.id,
        moduleId: module.id,
        courseId: module.courseId,
        title: lesson.title,
        status: lesson.status ?? (lesson.completed ? 'completed' : releaseDate && releaseDate > new Date() ? 'scheduled' : 'ready'),
        completed: Boolean(lesson.completed),
        releaseAt: lesson.releaseAt ?? (releaseDate ? releaseDate.toISOString() : null),
        releaseLabel: lesson.releaseLabel ?? (releaseDate ? formatDashboardDate(releaseDate) : null),
        metadata: lesson.metadata ?? {},
        progressPercent: lesson.progressPercent ?? (lesson.completed ? 100 : 0),
        completedAt: lesson.completedAt ?? null,
        nextActionLabel: lesson.nextActionLabel ?? (lesson.completed ? 'Reviewed' : 'Ready to start')
      };
    });
    const completedLessons = normalisedLessons.filter((lesson) => lesson.completed).length;
    const totalLessons = normalisedLessons.length;
    const nextLesson = normalisedLessons.find((lesson) => !lesson.completed) ?? null;
    const progressPercent = module.progress?.completionPercent;
    return {
      id: module.id,
      courseId: module.courseId,
      title: module.title,
      position: module.position ?? 0,
      releaseLabel: module.releaseLabel ?? null,
      completionPercent:
        progressPercent !== undefined && progressPercent !== null
          ? progressPercent
          : totalLessons === 0
            ? 0
            : Math.round((completedLessons / totalLessons) * 100),
      completedLessons: module.progress?.completedLessons ?? completedLessons,
      totalLessons: module.progress?.totalLessons ?? totalLessons,
      nextLesson: module.nextLesson ?? nextLesson,
      lessons: normalisedLessons
    };
  });

export default function CourseViewer() {
  const { courseId } = useParams();
  const { isLearner, dashboard } = useLearnerDashboardContext();
  const { surface, refresh: refreshDashboard, trackView, trackAction } = useDashboardSurface('course-viewer', {
    origin: 'course-viewer'
  });
  const course = useMemo(
    () => dashboard?.courses?.active.find((item) => item.id === courseId),
    [dashboard, courseId]
  );
  const workspaceUrl = useMemo(() => {
    const candidate =
      course?.workspaceUrl ??
      course?.launchUrl ??
      course?.learnspaceUrl ??
      course?.links?.workspace ??
      null;
    if (!candidate) {
      return null;
    }
    try {
      const base = typeof window !== 'undefined' ? window.location.origin : 'https://app.edulure.com';
      const url = new URL(candidate, base);
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        return url.href;
      }
      return null;
    } catch (_error) {
      return null;
    }
  }, [course]);
  const { session } = useAuth();
  const token = session?.tokens?.accessToken;
  const { socket } = useRealtime();
  const [playerSession, setPlayerSession] = useState(null);
  const [playerError, setPlayerError] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatError, setChatError] = useState(null);
  const [chatSending, setChatSending] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [presence, setPresence] = useState({ totalViewers: 0, viewers: [] });
  const messagesEndRef = useRef(null);
  const {
    progress: courseProgressSummary,
    lessons: progressLessons,
    enrollments: progressEnrollments,
    loading: progressLoading,
    error: progressError,
    refresh: refreshLearnerProgress,
    stale: progressStale,
    lastUpdatedAt: progressLastUpdatedAt,
    source: progressSource
  } = useLearnerProgress(courseId);
  const handleRefresh = useCallback(() => {
    refreshDashboard?.();
    refreshLearnerProgress();
  }, [refreshDashboard, refreshLearnerProgress]);
  const nextLessonFromSummary = courseProgressSummary?.nextLesson ?? null;
  const lessonFocusRef = useRef(false);
  const [focusedLessonId, setFocusedLessonId] = useState(() => nextLessonFromSummary?.id ?? null);

  const handleLaunchWorkspace = useCallback(() => {
    if (!workspaceUrl) {
      return;
    }
    trackAction('launch_workspace', { courseId, workspaceUrl });
    if (typeof window !== 'undefined') {
      window.open(workspaceUrl, '_blank', 'noopener');
    }
  }, [workspaceUrl, trackAction, courseId]);

  useEffect(() => {
    trackView({ courseId, isLearner, hasCourse: Boolean(course) });
  }, [trackView, courseId, isLearner, course]);

  const appendChatMessage = useCallback((message) => {
    if (!message) return;
    setChatMessages((prev) => {
      const exists = prev.some((entry) => entry.id === message.id);
      const next = exists
        ? prev.map((entry) => (entry.id === message.id ? message : entry))
        : [...prev, message];
      return next.sort((a, b) => new Date(a.sentAt ?? a.createdAt) - new Date(b.sentAt ?? b.createdAt));
    });
  }, []);

  const formatChatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    return formatDashboardDateTime(timestamp, { hour: '2-digit', minute: '2-digit' });
  };

  useEffect(() => {
    if (!token || !courseId) {
      setPlayerSession(null);
      setPresence({ totalViewers: 0, viewers: [] });
      return;
    }

    let cancelled = false;
    setPlayerError(null);

    fetchCoursePlayer(courseId, { token })
      .then((response) => {
        if (cancelled) return;
        const payload = response.data ?? null;
        setPlayerSession(payload);
        setPresence(payload?.live?.presence ?? { totalViewers: 0, viewers: [] });
      })
      .catch((error) => {
        if (!cancelled) {
          setPlayerError(error.message ?? 'Unable to load player session');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token, courseId]);

  useEffect(() => {
    if (!token || !courseId) {
      setChatMessages([]);
      return;
    }

    let cancelled = false;
    setChatError(null);

    fetchCourseLiveChat(courseId, { token, limit: 50 })
      .then((response) => {
        if (cancelled) return;
        const items = response.data ?? [];
        setChatMessages(items.sort((a, b) => new Date(a.sentAt ?? a.createdAt) - new Date(b.sentAt ?? b.createdAt)));
      })
      .catch((error) => {
        if (!cancelled) {
          setChatError(error.message ?? 'Unable to load live chat');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token, courseId]);

  useEffect(() => {
    if (!socket || !courseId) return undefined;

    const handleMessage = (payload) => {
      if (payload.courseId !== courseId) return;
      appendChatMessage(payload.message);
    };

    const handlePresence = (payload) => {
      if (payload.courseId !== courseId) return;
      setPresence(payload.presence ?? { totalViewers: 0, viewers: [] });
    };

    socket.on('course.message', handleMessage);
    socket.on('course.presence', handlePresence);
    socket.emit('course.join', { courseId });

    return () => {
      socket.emit('course.leave', { courseId });
      socket.off('course.message', handleMessage);
      socket.off('course.presence', handlePresence);
    };
  }, [socket, courseId, appendChatMessage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendChat = async () => {
    const trimmed = chatInput.trim();
    if (!trimmed || !token || !courseId) return;
    setChatSending(true);
    setChatError(null);
    try {
      const response = await postCourseLiveChat(courseId, { body: trimmed }, { token });
      const message = response.data ?? null;
      if (message) {
        appendChatMessage(message);
      }
      setChatInput('');
    } catch (error) {
      setChatError(error.message ?? 'Unable to send message');
    } finally {
      setChatSending(false);
    }
  };

  const handleChatKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendChat();
    }
  };

  const presencePreview = useMemo(() => presence.viewers?.slice?.(0, 3) ?? [], [presence]);
  const extraViewers = Math.max(0, (presence.totalViewers ?? 0) - presencePreview.length);

  const fallbackModules = useMemo(
    () => (Array.isArray(course?.modules) ? normaliseFallbackModules(course.modules) : []),
    [course?.modules]
  );

  useEffect(() => {
    const candidate = nextLessonFromSummary?.id ?? null;
    if (!lessonFocusRef.current) {
      setFocusedLessonId(candidate);
    } else if (candidate && candidate === focusedLessonId) {
      lessonFocusRef.current = false;
    }
  }, [focusedLessonId, nextLessonFromSummary?.id]);

  const progressLessonMap = useMemo(() => {
    const map = new Map();
    if (Array.isArray(progressLessons)) {
      progressLessons.forEach((lesson) => {
        if (lesson?.id) {
          map.set(lesson.id, lesson);
        }
      });
    }
    return map;
  }, [progressLessons]);

  const modules = useMemo(() => {
    const summaryModules = Array.isArray(courseProgressSummary?.modules)
      ? courseProgressSummary.modules
      : [];
    const baseModules = summaryModules.length ? summaryModules : fallbackModules;
    return baseModules.map((module) => {
      const lessons = Array.isArray(module.lessons) ? module.lessons : [];
      const mergedLessons = lessons.map((lesson) => {
        const progress = progressLessonMap.get(lesson.id) ?? null;
        const releaseAt = lesson.releaseAt ?? progress?.releaseAt ?? null;
        return {
          ...lesson,
          metadata: progress?.metadata ?? lesson.metadata ?? {},
          status: lesson.status ?? progress?.status ?? (lesson.completed ? 'completed' : 'ready'),
          completed: Boolean(lesson.completed ?? progress?.completed),
          progressPercent: lesson.progressPercent ?? progress?.progressPercent ?? (lesson.completed ? 100 : 0),
          releaseAt,
          releaseLabel:
            lesson.releaseLabel ??
            progress?.releaseLabel ??
            (releaseAt ? formatDashboardDate(releaseAt) : null),
          completedAt: lesson.completedAt ?? progress?.completedAt ?? null,
          nextActionLabel: lesson.nextActionLabel ?? progress?.nextActionLabel ?? (lesson.completed ? 'Reviewed' : 'Ready to start')
        };
      });
      return {
        ...module,
        lessons: mergedLessons,
        completionPercent:
          module.completionPercent ?? (module.totalLessons
            ? Math.round(((module.completedLessons ?? 0) / module.totalLessons) * 100)
            : 0),
        completedLessons: module.completedLessons ?? mergedLessons.filter((lesson) => lesson.completed).length,
        totalLessons: module.totalLessons ?? mergedLessons.length,
        nextLesson:
          module.nextLesson ?? mergedLessons.find((lesson) => !lesson.completed && lesson.status !== 'scheduled') ?? null
      };
    });
  }, [courseProgressSummary?.modules, fallbackModules, progressLessonMap]);

  const nextLessonDetail = nextLessonFromSummary ?? course?.nextLessonDetail ?? null;
  const completedLessonsCount = modules.reduce(
    (total, module) => total + (module.completedLessons ?? 0),
    0
  );
  const totalLessonsCount = modules.reduce(
    (total, module) => total + (module.totalLessons ?? (module.lessons?.length ?? 0)),
    0
  );

  const courseStartDate = useMemo(() => {
    if (!course?.startedAt) return null;
    const parsed = new Date(course.startedAt);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }, [course?.startedAt]);

  const lessonCatalogue = useMemo(
    () =>
      modules.flatMap((module, index) =>
        (module.lessons ?? []).map((lesson) => {
          const type = resolveLessonType(lesson);
          return {
            ...lesson,
            type,
            metadata: lesson.metadata ?? {},
            moduleId: module.id,
            moduleTitle: module.title,
            moduleIndex: index,
            modulePosition: module.position,
            moduleReleaseLabel: module.releaseLabel
          };
        })
      ),
    [modules]
  );

  const courseResources = useMemo(() => {
    const resourceMap = new Map();
    lessonCatalogue.forEach((lesson) => {
      const metadata = lesson.metadata ?? {};
      const rawResources = Array.isArray(metadata.resources)
        ? metadata.resources
        : metadata.resources && typeof metadata.resources === 'object'
          ? [metadata.resources]
          : [];
      rawResources.forEach((resource) => {
        if (!resource) return;
        const label = resource.label ?? resource.title ?? resource.name ?? null;
        if (!label) return;
        const href = resource.href ?? resource.url ?? resource.link ?? null;
        const key = `${label}:${href ?? ''}`;
        if (resourceMap.has(key)) return;
        resourceMap.set(key, {
          label,
          href,
          lessonTitle: lesson.title,
          type: resource.type ?? metadata.format ?? lesson.type ?? 'resource'
        });
      });
    });
    return Array.from(resourceMap.values());
  }, [lessonCatalogue]);

  const scheduledLessons = useMemo(
    () =>
      lessonCatalogue
        .filter((lesson) => lesson.status === 'scheduled')
        .map((lesson) => ({ ...lesson, releaseDate: parseDashboardDate(lesson.releaseAt) }))
        .sort((a, b) => (a.releaseDate?.getTime() ?? Infinity) - (b.releaseDate?.getTime() ?? Infinity)),
    [lessonCatalogue]
  );

  const readyLessons = useMemo(
    () =>
      lessonCatalogue
        .filter((lesson) => !lesson.completed && ['ready', 'available'].includes(lesson.status ?? 'ready'))
        .map((lesson) => ({ ...lesson, releaseDate: parseDashboardDate(lesson.releaseAt) }))
        .sort((a, b) => (a.releaseDate?.getTime() ?? 0) - (b.releaseDate?.getTime() ?? 0)),
    [lessonCatalogue]
  );

  const completedLessons = useMemo(
    () =>
      lessonCatalogue
        .filter((lesson) => lesson.completed)
        .map((lesson) => ({
          ...lesson,
          completedDate: parseDashboardDate(lesson.completedAt),
          releaseDate: parseDashboardDate(lesson.releaseAt)
        }))
        .sort((a, b) => {
          const aTime = a.completedDate?.getTime() ?? a.releaseDate?.getTime() ?? 0;
          const bTime = b.completedDate?.getTime() ?? b.releaseDate?.getTime() ?? 0;
          return bTime - aTime;
        }),
    [lessonCatalogue]
  );

  const computeLessonDueDate = useCallback(
    (lesson) => {
      const metadata = lesson.metadata ?? {};
      const dueAt = metadata.dueAt ?? metadata.dueDate ?? metadata.due_on;
      const dueDate = parseDashboardDate(dueAt);
      if (dueDate) return dueDate;
      if (metadata.dueOffsetDays != null && courseStartDate) {
        const offset = Number(metadata.dueOffsetDays);
        if (!Number.isNaN(offset)) {
          return new Date(courseStartDate.getTime() + offset * DAY_IN_MS);
        }
      }
      if (lesson.releaseAt) {
        const release = parseDashboardDate(lesson.releaseAt);
        if (release) return release;
      }
      return null;
    },
    [courseStartDate]
  );

  useEffect(() => {
    if (!focusedLessonId) {
      return;
    }
    const exists = lessonCatalogue.some((lesson) => lesson.id === focusedLessonId);
    if (!exists) {
      lessonFocusRef.current = false;
      setFocusedLessonId(nextLessonFromSummary?.id ?? null);
    }
  }, [focusedLessonId, lessonCatalogue, nextLessonFromSummary?.id]);

  const handleLessonFocusSelect = useCallback((lesson) => {
    const nextId = lesson?.id ?? null;
    lessonFocusRef.current = true;
    setFocusedLessonId(nextId);
  }, []);

  const focusedLesson = useMemo(
    () => lessonCatalogue.find((lesson) => lesson.id === focusedLessonId) ?? null,
    [lessonCatalogue, focusedLessonId]
  );
  const focusedLessonDueDate = focusedLesson ? computeLessonDueDate(focusedLesson) : null;
  const focusedLessonDueLabel =
    focusedLessonDueDate != null
      ? `${formatDashboardDate(focusedLessonDueDate)} · ${formatRelativeDayLabel(focusedLessonDueDate)}`
      : null;
  const derivedActiveLessonId =
    focusedLessonId ??
    nextLessonDetail?.lessonId ??
    nextLessonDetail?.id ??
    nextLessonFromSummary?.id ??
    null;

  const assessmentLessons = useMemo(
    () =>
      lessonCatalogue
        .filter((lesson) => ['assessment', 'assignment', 'exam', 'quiz'].includes(lesson.type))
        .map((lesson) => ({
          ...lesson,
          dueDate: computeLessonDueDate(lesson)
        }))
        .sort((a, b) => (a.dueDate?.getTime() ?? Infinity) - (b.dueDate?.getTime() ?? Infinity)),
    [lessonCatalogue, computeLessonDueDate]
  );

  const modulesCompleted = modules.filter((module) => (module.completionPercent ?? 0) >= 100);
  const modulesActive = modules.filter((module) => {
    const completion = module.completionPercent ?? 0;
    return completion > 0 && completion < 100;
  });
  const modulesUpcoming = Math.max(0, modules.length - modulesCompleted.length - modulesActive.length);

  const upcomingAssessments = assessmentLessons.filter((lesson) => !lesson.completed);
  const nextScheduled = scheduledLessons[0] ?? null;
  const readyLessonCount = readyLessons.length;
  const recordedLessons = completedLessons.slice(0, 6);
  const hasRefresherLessons = useMemo(
    () => lessonCatalogue.some((lesson) => lesson.type === 'refresher'),
    [lessonCatalogue]
  );
  const courseProgress = courseProgressSummary?.progressPercent ?? course?.progress ?? 0;
  const progressSnapshotLabel = progressLastUpdatedAt
    ? formatDashboardRelative(progressLastUpdatedAt)
    : null;
  const progressUsingCache = progressSource !== 'network' && progressSource !== 'initial';
  let progressInfoMessage = null;
  if (progressUsingCache) {
    progressInfoMessage = progressSnapshotLabel
      ? `Showing offline snapshot from ${progressSnapshotLabel}. Refresh to synchronise lessons.`
      : 'Showing offline snapshot stored on this device. Refresh to synchronise lessons.';
  } else if (progressStale && progressSnapshotLabel) {
    progressInfoMessage = `Progress snapshot from ${progressSnapshotLabel}. Refresh if you've been learning offline.`;
  } else if (progressSnapshotLabel) {
    progressInfoMessage = `Progress synced ${progressSnapshotLabel}.`;
  }
  const progressInfoTone = progressUsingCache || progressStale ? 'text-amber-600' : 'text-slate-400';
  const certificateEnrollment = useMemo(
    () =>
      Array.isArray(progressEnrollments)
        ? progressEnrollments.find((enrollment) => enrollment.courseId === course?.id)
        : null,
    [progressEnrollments, course?.id]
  );
  const certificateIssuedAt = certificateEnrollment?.completedAt ?? null;
  const certificateTemplate = useMemo(
    () => ({
      accentColor: courseProgressSummary?.certificateTemplate?.accentColor ?? '#4338ca',
      backgroundUrl:
        courseProgressSummary?.certificateTemplate?.backgroundUrl ?? course?.heroImageUrl ?? course?.thumbnailUrl ?? null,
      issuedBy:
        courseProgressSummary?.certificateTemplate?.issuedBy ?? course?.instructor ?? 'Edulure Academy'
    }),
    [
      courseProgressSummary?.certificateTemplate?.accentColor,
      courseProgressSummary?.certificateTemplate?.backgroundUrl,
      courseProgressSummary?.certificateTemplate?.issuedBy,
      course?.heroImageUrl,
      course?.thumbnailUrl,
      course?.instructor
    ]
  );
  const learnerDisplayName = useMemo(() => {
    const user = session?.user ?? {};
    if (user.fullName) return user.fullName;
    if (user.name) return user.name;
    const parts = [user.firstName, user.lastName].filter(Boolean);
    return parts.length ? parts.join(' ') : 'Learner';
  }, [session?.user]);
  const showCertificatePreview = courseProgress >= 100;
  const playbackSources = useMemo(
    () => selectPlaybackSources(playerSession?.playback),
    [playerSession?.playback]
  );
  const playbackPoster = useMemo(
    () => resolvePlaybackPoster(course, playerSession?.playback),
    [course, playerSession?.playback]
  );

  const insightCards = useMemo(
    () => [
      {
        id: 'progress',
        label: 'Overall progress',
        value: `${courseProgress}%`,
        detail: `${completedLessonsCount} of ${totalLessonsCount} lessons complete`,
        accent: 'from-primary to-primary-dark'
      },
      {
        id: 'modules',
        label: 'Module posture',
        value: `${modulesCompleted.length}/${modules.length || 0}`,
        detail: `${modulesActive.length} active • ${modulesUpcoming} upcoming`,
        accent: 'from-sky-400 to-indigo-500'
      },
      {
        id: 'next-unlock',
        label: 'Next unlock',
        value: nextScheduled?.releaseDate ? formatDashboardDate(nextScheduled.releaseDate) : 'All released',
        detail: nextScheduled ? `${nextScheduled.moduleTitle} · ${nextScheduled.title}` : 'Review mastery materials',
        accent: 'from-amber-400 to-orange-500'
      },
      {
        id: 'ready',
        label: 'Ready to launch',
        value: String(readyLessonCount),
        detail: `${upcomingAssessments.length} graded checkpoints scheduled`,
        accent: 'from-emerald-400 to-emerald-600'
      }
    ],
    [
      courseProgress,
      completedLessonsCount,
      totalLessonsCount,
      modulesCompleted.length,
      modules.length,
      modulesActive.length,
      modulesUpcoming,
      nextScheduled,
      readyLessonCount,
      upcomingAssessments.length
    ]
  );
  if (!isLearner) {
    return (
      <DashboardStateMessage
        variant="error"
        title="Learner Learnspace required"
        description="Switch to your learner dashboard to open course sessions and live cohorts."
      />
    );
  }

  if (!dashboard?.courses) {
    return (
      <DashboardStateMessage
        title="Courses unavailable"
        description="We could not find course data for your learner Learnspace. Refresh the dashboard and try again."
      />
    );
  }

  if (!course) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-600">Course not found or not part of your current programs.</p>
        <Link to="/dashboard/learner/courses" className="text-sm font-semibold text-primary hover:underline">
          Back to courses
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <DashboardSwitcherHeader
        surface={surface}
        onRefresh={handleRefresh}
        title={course ? course.title : 'Course workspace'}
        description={
          nextLessonDetail
            ? `Next up: ${nextLessonDetail.moduleTitle} · ${nextLessonDetail.lessonTitle}${
                nextLessonDetail.status === 'scheduled' && nextLessonDetail.releaseAt
                  ? ` • Unlocks ${new Date(nextLessonDetail.releaseAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric'
                    })}`
                  : ''
              }`
            : 'All scheduled lessons completed.'
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-3">
          <button
            type="button"
            className="dashboard-primary-pill"
            onClick={handleLaunchWorkspace}
            disabled={!workspaceUrl}
            title={!workspaceUrl ? 'Workspace link unavailable' : 'Open Learnspace in a new tab'}
          >
            Launch Learnspace
          </button>
          <Link to="/dashboard/learner/courses" className="dashboard-pill">
            Back to courses
          </Link>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {insightCards.map((card) => (
          <div
            key={card.id}
            className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-primary/40 hover:shadow-lg"
          >
            <span className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${card.accent}`} aria-hidden="true" />
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{card.value}</p>
            <p className="mt-2 text-xs text-slate-500">{card.detail}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,_2fr)_minmax(0,_1fr)]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Live classroom</h2>
          {playerError ? (
            <p className="mt-3 text-sm text-red-600" role="alert">
              {playerError}
            </p>
          ) : playbackSources.length ? (
            <video
              controls
              preload="metadata"
              poster={playbackPoster}
              className="mt-4 w-full rounded-2xl bg-slate-900"
            >
              {playbackSources.map((source) => (
                <source key={source.url} src={source.url} type={source.mimeType} />
              ))}
              Your browser does not support the video tag.
            </video>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
              Live stream will appear when the instructor starts broadcasting.
            </div>
          )}
          {playerSession?.playback ? (
            <p className="mt-2 text-xs text-slate-500">Adaptive streaming keeps playback smooth on slower connections.</p>
          ) : null}
          {playerSession?.playback && (
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                {presence.totalViewers ?? 0} live {(presence.totalViewers ?? 0) === 1 ? 'viewer' : 'viewers'}
              </span>
              {playerSession.playback.liveEdgeLatencySeconds && (
                <span className="rounded-full bg-slate-100 px-3 py-1">
                  {playerSession.playback.liveEdgeLatencySeconds}s latency
                </span>
              )}
              {playerSession.chat?.channel && (
                <span className="rounded-full bg-slate-100 px-3 py-1">Channel {playerSession.chat.channel}</span>
              )}
            </div>
          )}
          {presencePreview.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
              {presencePreview.map((viewer) => (
                <span key={viewer.id ?? viewer.name} className="rounded-full bg-slate-100 px-3 py-1">
                  {viewer.name}
                </span>
              ))}
              {extraViewers > 0 && <span className="text-slate-400">+{extraViewers} more</span>}
            </div>
          )}
        </div>

        <div className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4">
            <h2 className="text-sm font-semibold text-slate-800">Live chat</h2>
            <p className="text-xs text-slate-500">Coordinate with peers during the session.</p>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
              Live chat is running in preview mode while we finish the realtime service upgrade. Messages refresh in batches
              every few seconds and reactions are not yet persisted.
            </p>
            {chatError && (
              <p className="rounded-2xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600" role="alert">
                {chatError}
              </p>
            )}
            {chatMessages.map((message) => {
              const isMine = message.user?.id === session?.user?.id;
              return (
                <div key={message.id} className={classNames('flex', isMine ? 'justify-end' : 'justify-start')}>
                  <div
                    className={classNames(
                      'max-w-sm rounded-3xl px-4 py-3 text-sm shadow',
                      isMine ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700'
                    )}
                  >
                    <p className={classNames('text-xs font-semibold uppercase tracking-wide', isMine ? 'text-white/70' : 'text-slate-500')}>
                      {message.user?.name ?? 'Learner'}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap leading-relaxed">{message.body}</p>
                    <p className={classNames('mt-2 text-[10px] uppercase tracking-wide', isMine ? 'text-white/60' : 'text-slate-400')}>
                      {formatChatTimestamp(message.sentAt ?? message.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
            {chatMessages.length === 0 && !chatError && (
              <p className="text-xs text-slate-400">Be the first to share a resource or question.</p>
            )}
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              handleSendChat();
            }}
            className="border-t border-slate-200 p-4"
          >
            <div className="space-y-2">
              <textarea
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                onKeyDown={handleChatKeyDown}
                placeholder="Share a note with the cohort"
                rows={3}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <div className="flex items-center justify-end gap-3">
                <button
                  type="submit"
                  disabled={!chatInput.trim() || chatSending}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {chatSending ? 'Sending…' : 'Send'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,_2fr)_minmax(0,_1fr)]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Lesson queue</h2>
              <p className="mt-2 text-sm text-slate-600">
                Navigate cohorts with confidence. Lesson states refresh as you wrap activities or as modules unlock.
              </p>
            </div>
            <button
              type="button"
              className="dashboard-pill self-start px-4 py-2 text-xs font-semibold"
              onClick={() => refreshLearnerProgress()}
              disabled={progressLoading}
            >
              {progressLoading ? 'Refreshing…' : 'Refresh progress'}
            </button>
          </div>
          {progressError ? (
            <p className="mt-3 text-sm text-amber-600" role="status">
              {progressError.message ?? 'Unable to synchronise progress right now.'}
            </p>
          ) : null}
          <CourseModuleNavigator
            modules={modules}
            className="mt-6"
            emptyLabel="Modules for this program will appear here once your instructor publishes the curriculum."
            onLessonSelect={handleLessonFocusSelect}
            activeLessonId={derivedActiveLessonId}
          />
          {focusedLesson ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Focused lesson</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{focusedLesson.title}</p>
              <p className="text-xs text-slate-500">{focusedLesson.moduleTitle}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                <span
                  className={`rounded-full px-2 py-1 ${
                    focusedLesson.completed
                      ? 'bg-emerald-50 text-emerald-600'
                      : focusedLesson.status === 'scheduled'
                        ? 'bg-amber-50 text-amber-600'
                        : 'bg-primary/10 text-primary'
                  }`}
                >
                  {focusedLesson.completed
                    ? 'Completed'
                    : focusedLesson.status === 'scheduled'
                      ? 'Scheduled'
                      : 'Ready'}
                </span>
                {focusedLessonDueLabel ? (
                  <span className="rounded-full bg-white px-2 py-1 text-slate-600">{focusedLessonDueLabel}</span>
                ) : null}
                {focusedLesson.durationMinutes ? (
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">
                    {focusedLesson.durationMinutes} mins
                  </span>
                ) : null}
              </div>
              {focusedLesson.nextActionLabel ? (
                <p className="mt-3 text-xs text-slate-500">{focusedLesson.nextActionLabel}</p>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="space-y-6">
          <div className="dashboard-section">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Progress</h2>
              {progressLoading ? <span className="text-xs text-slate-400">Syncing…</span> : null}
            </div>
            <p className="mt-2 text-sm text-slate-600">{courseProgress}% complete</p>
            <CourseProgressBar
              value={courseProgress}
              className="mt-4"
              tone={courseProgress >= 100 ? 'emerald' : 'primary'}
              srLabel="Overall course progress"
            />
            <p className="mt-3 text-xs text-slate-500">
              {completedLessonsCount} of {totalLessonsCount} lessons wrapped
            </p>
            {progressInfoMessage ? (
              <p className={`mt-2 text-xs ${progressInfoTone}`}>{progressInfoMessage}</p>
            ) : null}
            {nextLessonDetail ? (
              <p className="mt-2 text-xs text-primary">
                Next action: {nextLessonDetail.moduleTitle} · {nextLessonDetail.lessonTitle}
                {nextLessonDetail.status === 'scheduled' && nextLessonDetail.releaseAt
                  ? ` • Unlocks ${new Date(nextLessonDetail.releaseAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric'
                    })}`
                  : ''}
              </p>
            ) : (
              <p className="mt-2 text-xs text-emerald-600">You&apos;ve completed the learning path.</p>
            )}
          </div>
          {showCertificatePreview ? (
            <div className="dashboard-section space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Certificate preview</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Celebrate your achievement with a shareable certificate ready for LinkedIn or print.
                </p>
              </div>
              <CertificatePreview
                courseTitle={course?.title ?? 'Completed course'}
                learnerName={learnerDisplayName}
                issuedAt={certificateIssuedAt ?? new Date().toISOString()}
                issuer={certificateTemplate.issuedBy}
                accentColor={certificateTemplate.accentColor}
                backgroundUrl={certificateTemplate.backgroundUrl ?? undefined}
              />
            </div>
          ) : null}
          <div className="dashboard-section space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Resources</h2>
              <p className="mt-2 text-sm text-slate-600">
                Download supporting materials, worksheets, and reference guides for each lesson.
              </p>
            </div>
            {courseResources.length ? (
              <ul className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                {courseResources.map((resource) => {
                  const key = `${resource.label}-${resource.href ?? resource.lessonTitle ?? 'no-link'}`;
                  const content = (
                    <>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-slate-900">{resource.label}</span>
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          {resource.type?.toString().replace(/_/g, ' ') ?? 'resource'}
                        </span>
                      </div>
                      {resource.lessonTitle ? (
                        <p className="text-xs text-slate-500">From “{resource.lessonTitle}”</p>
                      ) : null}
                    </>
                  );
                  if (resource.href) {
                    return (
                      <li key={key}>
                        <a
                          href={resource.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm transition hover:border-primary hover:text-primary"
                        >
                          {content}
                        </a>
                      </li>
                    );
                  }
                  return (
                    <li key={key} className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
                      {content}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">
                Lesson downloads will appear here as instructors attach workbooks or playbooks to upcoming modules.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,_3fr)_minmax(0,_2fr)]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Enterprise schedule control</h2>
              <p className="text-sm text-slate-600">Monitor drip unlocks, live classrooms, and pacing compliance.</p>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">{scheduledLessons.length} upcoming unlocks</span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">{readyLessonCount} ready today</span>
            </div>
          </div>
          <div className="mt-6 space-y-4">
            {scheduledLessons.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
                All lessons are unlocked. Maintain cadence with available modules and refreshers.
              </div>
            ) : (
              scheduledLessons.slice(0, 6).map((lesson) => (
                <div key={lesson.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{lesson.title}</p>
                      <p className="text-xs text-slate-500">{lesson.moduleTitle}</p>
                    </div>
                    <div className="text-right text-xs">
                      <p className="text-sm font-semibold text-slate-900">{formatDashboardDate(lesson.releaseDate)}</p>
                      <p className={classNames('font-semibold', determineScheduleTone(lesson.releaseDate))}>
                        {formatRelativeDayLabel(lesson.releaseDate)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    {lesson.moduleReleaseLabel && (
                      <span className="rounded-full bg-white px-2 py-1 text-slate-600">{lesson.moduleReleaseLabel}</span>
                    )}
                    <span className="rounded-full bg-primary/10 px-2 py-1 text-primary">{formatLessonTypeLabel(lesson.type)}</span>
                    {lesson.durationMinutes ? (
                      <span className="rounded-full bg-white px-2 py-1 text-slate-600">{lesson.durationMinutes} mins</span>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
          {scheduledLessons.length > 6 && (
            <p className="mt-4 text-xs text-slate-500">
              +{scheduledLessons.length - 6} additional unlocks staged in the drip roadmap.
            </p>
          )}
        </div>
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">Assessments & compliance</h3>
            <p className="mt-1 text-sm text-slate-600">Track submissions, exams, quizzes, and graded checkpoints.</p>
            <div className="mt-4 space-y-3">
              {assessmentLessons.length === 0 ? (
                <p className="text-xs text-slate-500">No graded work scheduled. Focus on progressing through available lessons.</p>
              ) : (
                assessmentLessons.slice(0, 5).map((lesson) => {
                  const metadata = lesson.metadata ?? {};
                  const dueDate = lesson.dueDate ?? null;
                  const required = metadata.required ?? lesson.required ?? true;
                  const attempts = metadata.attempts ?? lesson.attempts ?? metadata.attemptCount ?? null;
                  const score = metadata.score ?? lesson.score ?? null;
                  return (
                    <AssessmentQuickView
                      key={lesson.id}
                      assessment={{
                        id: lesson.id,
                        title: lesson.title,
                        moduleTitle: lesson.moduleTitle,
                        typeLabel: formatLessonTypeLabel(lesson.type),
                        type: lesson.type,
                        dueDate,
                        required,
                        completed: lesson.completed,
                        statusLabel: required ? (lesson.completed ? 'Completed' : 'Required') : 'Optional',
                        attempts: attempts != null ? Number(attempts) : null,
                        score: score != null ? Number(score) : null,
                        durationMinutes: lesson.durationMinutes ?? metadata.durationMinutes
                      }}
                    />
                  );
                })
              )}
            </div>
            {assessmentLessons.length > 5 && (
              <p className="mt-4 text-xs text-slate-500">
                +{assessmentLessons.length - 5} additional assessments scheduled across the cohort.
              </p>
            )}
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">Recorded mastery library</h3>
            <p className="mt-1 text-sm text-slate-600">On-demand access to completed lessons and refresher pathways.</p>
            <div className="mt-4 space-y-3">
              {recordedLessons.length === 0 ? (
                <p className="text-xs text-slate-500">Complete lessons to unlock your recording archive and refresher drills.</p>
              ) : (
                recordedLessons.map((lesson) => {
                  const completedDate = lesson.completedDate ?? parseDashboardDate(lesson.completedAt);
                  return (
                    <div
                      key={`${lesson.id}-recorded`}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{lesson.title}</p>
                        <p className="text-xs text-slate-500">{lesson.moduleTitle}</p>
                      </div>
                      <div className="text-right text-xs text-slate-500">
                        <p className="font-semibold text-slate-800">{formatDashboardDate(completedDate)}</p>
                        <p>{lesson.durationMinutes ? `${lesson.durationMinutes} mins` : 'Self-paced'}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            {recordedLessons.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-primary">
                <button type="button" className="dashboard-pill px-3 py-1">
                  View full library
                </button>
                {hasRefresherLessons && (
                  <button type="button" className="dashboard-pill px-3 py-1">
                    Launch refresher plan
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
