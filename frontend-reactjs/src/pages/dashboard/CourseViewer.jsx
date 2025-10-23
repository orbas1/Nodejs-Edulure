import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

import { fetchCoursePlayer, fetchCourseLiveChat, postCourseLiveChat } from '../../api/courseApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useRealtime } from '../../context/RealtimeContext.jsx';
import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import CourseOutlineNav from '../../components/course/CourseOutlineNav.jsx';
import CourseProgressMeter from '../../components/course/CourseProgressMeter.jsx';
import { useLearnerDashboardContext } from '../../hooks/useLearnerDashboard.js';
import useLearnerProgress from '../../hooks/useLearnerProgress.js';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const parseDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDateLabel = (date) => {
  if (!date) return 'TBC';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const formatRelativeDay = (date) => {
  if (!date) return 'Date pending';
  const now = new Date();
  const diffDays = Math.round((date.getTime() - now.getTime()) / DAY_IN_MS);
  if (diffDays > 1) return `In ${diffDays} days`;
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === 0) return 'Today';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays < -1) return `${Math.abs(diffDays)} days ago`;
  return 'Date pending';
};

const determineScheduleTone = (date) => {
  if (!date) return 'text-slate-400';
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  if (diffMs < 0) return 'text-red-600';
  if (diffMs <= 2 * DAY_IN_MS) return 'text-amber-500';
  return 'text-emerald-600';
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

export default function CourseViewer() {
  const { courseId } = useParams();
  const { isLearner, dashboard } = useLearnerDashboardContext();
  const course = useMemo(
    () => dashboard?.courses?.active.find((item) => item.id === courseId),
    [dashboard, courseId]
  );
  const { session } = useAuth();
  const token = session?.tokens?.accessToken;
  const { socket } = useRealtime();
  const {
    outline,
    loading: progressLoading,
    error: progressError,
    updateLessonProgress,
    updatingLesson
  } = useLearnerProgress(courseId);
  const [playerSession, setPlayerSession] = useState(null);
  const [playerError, setPlayerError] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatError, setChatError] = useState(null);
  const [chatSending, setChatSending] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [presence, setPresence] = useState({ totalViewers: 0, viewers: [] });
  const [activeLessonSlug, setActiveLessonSlug] = useState(null);
  const [progressFeedback, setProgressFeedback] = useState(null);
  const messagesEndRef = useRef(null);

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
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

  useEffect(() => {
    if (!modules.length) {
      if (activeLessonSlug) {
        setActiveLessonSlug(null);
      }
      return;
    }

    const flatLessons = modules.flatMap((module) => module.lessons ?? []);
    const hasActive = flatLessons.some((lesson) => lesson.slug === activeLessonSlug);
    if (!hasActive) {
      const firstInteractive = flatLessons.find((lesson) => lesson.status !== 'scheduled') ?? flatLessons[0];
      setActiveLessonSlug(firstInteractive?.slug ?? null);
    }
  }, [modules, activeLessonSlug]);

  useEffect(() => {
    if (!progressFeedback?.message) {
      return undefined;
    }
    const timeout = window.setTimeout(() => setProgressFeedback(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [progressFeedback]);

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

  const handleSelectLesson = useCallback((lesson) => {
    if (!lesson?.slug) return;
    setActiveLessonSlug(lesson.slug);
  }, []);

  const handleToggleLessonComplete = useCallback(
    async (lesson, nextCompleted) => {
      if (!lesson?.slug) return;
      try {
        await updateLessonProgress(lesson.slug, {
          completed: nextCompleted,
          progressPercent: nextCompleted ? 100 : 0,
          progressSource: 'manual'
        });
        setProgressFeedback({
          type: 'success',
          message: nextCompleted ? 'Lesson marked as complete.' : 'Lesson marked as incomplete.'
        });
      } catch (error) {
        setProgressFeedback({
          type: 'error',
          message: error.message ?? 'Unable to update lesson progress.'
        });
      }
    },
    [updateLessonProgress]
  );

  const presencePreview = useMemo(() => presence.viewers?.slice?.(0, 3) ?? [], [presence]);
  const extraViewers = Math.max(0, (presence.totalViewers ?? 0) - presencePreview.length);

  const modules = useMemo(() => {
    if (Array.isArray(outline?.modules)) {
      return outline.modules;
    }
    if (Array.isArray(course?.modules)) {
      return course.modules;
    }
    return [];
  }, [outline?.modules, course?.modules]);

  const computedNextLesson = useMemo(() => {
    for (const module of modules) {
      if (module?.nextLesson) {
        return {
          moduleTitle: module.title,
          lessonTitle: module.nextLesson.title,
          status: module.nextLesson.status,
          releaseAt: module.nextLesson.releaseAt
        };
      }
    }
    return null;
  }, [modules]);

  const nextLessonDetail = computedNextLesson ?? course?.nextLessonDetail ?? null;

  const completedLessonsCount =
    outline?.totals?.completedLessons ??
    modules.reduce((total, module) => total + (module.progress?.completedLessons ?? 0), 0);

  const totalLessonsCount =
    outline?.totals?.lessonCount ??
    modules.reduce((total, module) => total + (module.progress?.totalLessons ?? 0), 0);

  const courseStartDate = useMemo(() => {
    const source = outline?.enrollment?.startedAt ?? course?.startedAt;
    if (!source) return null;
    const parsed = new Date(source);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }, [outline?.enrollment?.startedAt, course?.startedAt]);

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

  const scheduledLessons = useMemo(
    () =>
      lessonCatalogue
        .filter((lesson) => lesson.status === 'scheduled')
        .map((lesson) => ({ ...lesson, releaseDate: parseDate(lesson.releaseAt) }))
        .sort((a, b) => (a.releaseDate?.getTime() ?? Infinity) - (b.releaseDate?.getTime() ?? Infinity)),
    [lessonCatalogue]
  );

  const readyLessons = useMemo(
    () =>
      lessonCatalogue
        .filter((lesson) => !lesson.completed && lesson.status === 'available')
        .map((lesson) => ({ ...lesson, releaseDate: parseDate(lesson.releaseAt) }))
        .sort((a, b) => (a.releaseDate?.getTime() ?? 0) - (b.releaseDate?.getTime() ?? 0)),
    [lessonCatalogue]
  );

  const completedLessons = useMemo(
    () =>
      lessonCatalogue
        .filter((lesson) => lesson.completed)
        .map((lesson) => ({
          ...lesson,
          completedDate: parseDate(lesson.completedAt),
          releaseDate: parseDate(lesson.releaseAt)
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
      const dueDate = parseDate(dueAt);
      if (dueDate) return dueDate;
      if (metadata.dueOffsetDays != null && courseStartDate) {
        const offset = Number(metadata.dueOffsetDays);
        if (!Number.isNaN(offset)) {
          return new Date(courseStartDate.getTime() + offset * DAY_IN_MS);
        }
      }
      if (lesson.releaseAt) {
        const release = parseDate(lesson.releaseAt);
        if (release) return release;
      }
      return null;
    },
    [courseStartDate]
  );

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

  const modulesCompleted = modules.filter((module) => (module.progress?.completionPercent ?? 0) >= 100);
  const modulesActive = modules.filter((module) => {
    const completion = module.progress?.completionPercent ?? 0;
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
  const courseProgress = useMemo(() => {
    if (outline?.totals?.progressPercent != null) {
      const numeric = Number(outline.totals.progressPercent);
      if (Number.isFinite(numeric)) {
        return Math.max(0, Math.min(100, Math.round(numeric * 10) / 10));
      }
    }
    const fallback = Number(course?.progress ?? 0);
    return Number.isFinite(fallback) ? fallback : 0;
  }, [outline?.totals?.progressPercent, course?.progress]);

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
        value: nextScheduled?.releaseDate ? formatDateLabel(nextScheduled.releaseDate) : 'All released',
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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Course viewer</p>
          <h1 className="text-2xl font-semibold text-slate-900">{course.title}</h1>
          <p className="text-sm text-slate-600">Facilitated by {course.instructor}</p>
          {nextLessonDetail ? (
            <p className="mt-1 text-xs font-semibold text-primary">
              Next up: {nextLessonDetail.moduleTitle} · {nextLessonDetail.lessonTitle}
              {nextLessonDetail.status === 'scheduled' && nextLessonDetail.releaseAt
                ? ` • Unlocks ${new Date(nextLessonDetail.releaseAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric'
                  })}`
                : ''}
            </p>
          ) : (
            <p className="mt-1 text-xs font-semibold text-emerald-600">All scheduled lessons completed.</p>
          )}
        </div>
        <div className="flex gap-3">
          <button type="button" className="dashboard-primary-pill">
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
          ) : playerSession?.playback?.url ? (
            <video
              controls
              className="mt-4 w-full rounded-2xl bg-slate-900"
              src={playerSession.playback.url}
            />
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
              Live stream will appear when the instructor starts broadcasting.
            </div>
          )}
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
          <h2 className="text-lg font-semibold text-slate-900">Lesson queue</h2>
          <p className="mt-2 text-sm text-slate-600">
            Navigate cohorts with confidence. Lesson states update instantly as you wrap activities or as modules unlock.
          </p>
          {progressError ? (
            <p className="mt-4 rounded-2xl bg-red-50 px-4 py-2 text-xs font-semibold text-red-600" role="alert">
              {progressError.message ?? 'Unable to load course progress.'}
            </p>
          ) : null}
          {progressFeedback?.message ? (
            <p
              className={`mt-4 rounded-2xl px-4 py-2 text-xs font-semibold ${
                progressFeedback.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-primary/10 text-primary'
              }`}
              role={progressFeedback.type === 'error' ? 'alert' : undefined}
            >
              {progressFeedback.message}
            </p>
          ) : null}
          {progressLoading ? (
            <p className="mt-4 text-xs text-slate-400">Refreshing lesson progress…</p>
          ) : null}
          <div className="mt-6">
            <CourseOutlineNav
              modules={modules}
              activeLessonSlug={activeLessonSlug}
              updatingLesson={updatingLesson}
              onSelectLesson={handleSelectLesson}
              onToggleLessonComplete={handleToggleLessonComplete}
            />
          </div>
        </div>
        <div className="space-y-6">
          <CourseProgressMeter
            progressPercent={courseProgress}
            completedLessons={completedLessonsCount}
            totalLessons={totalLessonsCount}
            certificate={outline?.certificate}
          />
          <div className="dashboard-section">
            <h2 className="text-lg font-semibold text-slate-900">Resources</h2>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              <li className="dashboard-card-muted px-3 py-2">Program handbook</li>
              <li className="dashboard-card-muted px-3 py-2">Sprint templates</li>
              <li className="dashboard-card-muted px-3 py-2">Mentor office hours</li>
            </ul>
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
                      <p className="text-sm font-semibold text-slate-900">{formatDateLabel(lesson.releaseDate)}</p>
                      <p className={classNames('font-semibold', determineScheduleTone(lesson.releaseDate))}>
                        {formatRelativeDay(lesson.releaseDate)}
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
                  const dueDate = lesson.dueDate;
                  const tone = determineScheduleTone(dueDate);
                  return (
                    <div key={lesson.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{lesson.title}</p>
                          <p className="text-xs text-slate-500">{lesson.moduleTitle}</p>
                        </div>
                        <div className="text-right text-xs">
                          <p className={classNames('text-sm font-semibold', tone)}>{formatDateLabel(dueDate)}</p>
                          <p className={classNames('font-semibold', tone)}>{formatRelativeDay(dueDate)}</p>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        <span className="rounded-full bg-primary/10 px-2 py-1 text-primary">{formatLessonTypeLabel(lesson.type)}</span>
                        <span className="rounded-full bg-white px-2 py-1 text-slate-600">
                          {lesson.required === false ? 'Optional' : 'Required'}
                        </span>
                        {typeof lesson.score === 'number' && Number.isFinite(lesson.score) && (
                          <span className="rounded-full bg-white px-2 py-1 text-slate-600">Score {lesson.score}%</span>
                        )}
                        {typeof lesson.attempts === 'number' && lesson.attempts > 0 && (
                          <span className="rounded-full bg-white px-2 py-1 text-slate-600">
                            {lesson.attempts} attempt{lesson.attempts === 1 ? '' : 's'}
                          </span>
                        )}
                      </div>
                    </div>
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
                  const completedDate = lesson.completedDate ?? parseDate(lesson.completedAt);
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
                        <p className="font-semibold text-slate-800">{formatDateLabel(completedDate)}</p>
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
