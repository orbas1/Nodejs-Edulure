import { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';

import VerificationStatusCard from '../../../components/dashboard/VerificationStatusCard.jsx';
import LearnerProgressCard from '../../../components/dashboard/LearnerProgressCard.jsx';
import LearnerCommunityEngagementSection from './sections/LearnerCommunityEngagementSection.jsx';
import LearnerFeedHighlightsSection from './sections/LearnerFeedHighlightsSection.jsx';
import LearnerMetricsSection from './sections/LearnerMetricsSection.jsx';
import LearnerNotificationsSection from './sections/LearnerNotificationsSection.jsx';
import LearnerPaceSection from './sections/LearnerPaceSection.jsx';
import LearnerProfileSection from './sections/LearnerProfileSection.jsx';
import LearnerSafetySection from './sections/LearnerSafetySection.jsx';
import LearnerUpcomingSection from './sections/LearnerUpcomingSection.jsx';
import LearnerBlogSection from './sections/LearnerBlogSection.jsx';
import LearnerProfileEditor from './sections/LearnerProfileEditor.jsx';
import LearnerGoalsSection from './sections/LearnerGoalsSection.jsx';
import LearnerSurveySection from './sections/LearnerSurveySection.jsx';
import LearnerRevenueBanner from './sections/LearnerRevenueBanner.jsx';
import LearnerQuickActionsSection from './sections/LearnerQuickActionsSection.jsx';

function normaliseSectionKey(name) {
  return name?.toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function expandSectionKeys(name) {
  const base = normaliseSectionKey(name);
  if (!base) {
    return [];
  }
  const variants = new Set([
    base,
    base.replace(/^learner-/, ''),
    base.replace(/-section$/, ''),
    base.replace(/-status$/, ''),
    base.replace(/-controls$/, ''),
    base.replace(/-commitments$/, ''),
    base.replace(/-highlights$/, 'highlights'),
    base.replace(/-metrics$/, 'metrics'),
    base.replace(/-editor$/, 'profile-editor'),
    base.replace(/s$/, ''),
    `${base}s`
  ]);
  return Array.from(variants).filter(Boolean);
}

function createSectionAccessControl(dashboard) {
  const access = dashboard?.access ?? dashboard?.permissions ?? {};
  const allowedSources = [
    dashboard?.entitlements,
    access.entitlements,
    access.sections,
    access.allowed,
    access.allowedSections,
    access.visibleSections
  ];
  const blockedSources = [
    access.blocked,
    access.blockedSections,
    access.hiddenSections,
    access.restrictedSections
  ];

  const allowed = new Set(
    allowedSources
      .flatMap((value) => (Array.isArray(value) ? value : value ? [value] : []))
      .map(normaliseSectionKey)
      .filter(Boolean)
  );

  const blocked = new Set(
    blockedSources
      .flatMap((value) => (Array.isArray(value) ? value : value ? [value] : []))
      .map(normaliseSectionKey)
      .filter(Boolean)
  );

  const roles = new Set(
    [
      dashboard?.role,
      ...(Array.isArray(dashboard?.roles) ? dashboard.roles : []),
      ...(Array.isArray(access?.roles) ? access.roles : []),
      ...(Array.isArray(dashboard?.actor?.roles) ? dashboard.actor.roles : [])
    ]
      .flat()
      .map(normaliseSectionKey)
      .filter(Boolean)
  );

  const matchesSet = (set, key) => {
    const variants = expandSectionKeys(key);
    if (variants.length === 0) {
      return false;
    }
    return variants.some((variant) => set.has(variant));
  };

  return {
    canView(section) {
      const key = normaliseSectionKey(section);
      if (!key) return true;
      if (matchesSet(blocked, key)) {
        return false;
      }
      if (allowed.size === 0) {
        return true;
      }
      return matchesSet(allowed, key) || allowed.size === 0;
    },
    hasRole(role) {
      const key = normaliseSectionKey(role);
      if (!key) return true;
      if (roles.size === 0) {
        return true;
      }
      return roles.has(key);
    }
  };
}

function sanitiseActionLink(url) {
  if (!url || typeof url !== 'string') {
    return null;
  }

  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://app.edulure.com';
    const parsed = new URL(url, origin);
    if (!['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
      return null;
    }
    return parsed.toString();
  } catch (error) {
    return null;
  }
}

function normaliseMetrics(metrics) {
  if (!Array.isArray(metrics)) return [];
  return metrics.filter((metric) => metric?.label && metric?.value !== undefined);
}

function normaliseLearningPace(entries) {
  if (!Array.isArray(entries)) return [];
  return entries.map((entry) => ({
    label: entry.day ?? entry.label ?? 'Day',
    minutes: Number.isFinite(entry.minutes) ? entry.minutes : Number(entry.minutes ?? 0)
  }));
}

function normaliseUpcoming(upcoming) {
  if (!Array.isArray(upcoming)) return [];
  return upcoming
    .filter((event) => event?.id)
    .map((event) => ({
      id: event.id,
      type: event.type ?? 'Session',
      date: event.date ?? event.time ?? 'TBC',
      title: event.title ?? 'Upcoming session',
      host: event.host ?? 'Edulure team',
      action: event.action ?? 'View details',
      href: sanitiseActionLink(event.href ?? event.url ?? event.actionUrl ?? event.ctaUrl)
    }));
}

function normaliseQuickActions({ progressCards, upcoming, dashboard }) {
  const actions = [];
  const seenIds = new Set();

  const pushAction = (action) => {
    if (!action) return;
    const idRaw = action.id ?? action.key ?? action.slug ?? null;
    const id = idRaw != null ? String(idRaw) : null;
    const labelRaw = action.label ?? action.title ?? null;
    const label = typeof labelRaw === 'string' ? labelRaw.trim() : null;
    if (!id || !label || seenIds.has(id)) {
      return;
    }
    const descriptionRaw = action.description ?? action.body ?? null;
    const description =
      typeof descriptionRaw === 'string' && descriptionRaw.trim().length > 0
        ? descriptionRaw.trim()
        : null;
    const href =
      sanitiseActionLink(
        action.href ?? action.url ?? action.link ?? action.actionHref ?? action.cta?.href ?? null
      ) ?? null;
    const ctaRaw = action.ctaLabel ?? action.cta?.label ?? action.actionLabel ?? null;
    const ctaLabel =
      typeof ctaRaw === 'string' && ctaRaw.trim().length > 0 ? ctaRaw.trim() : 'Open';

    actions.push({
      id,
      label,
      description,
      href,
      ctaLabel
    });
    seenIds.add(id);
  };

  if (Array.isArray(dashboard?.quickActions)) {
    dashboard.quickActions.forEach((action) => pushAction(action));
  }

  const hasLabel = (label) => actions.some((action) => action.label === label);

  const primaryCourse = Array.isArray(dashboard?.courses?.active)
    ? dashboard.courses.active[0]
    : null;
  const resumeCard = Array.isArray(progressCards) && progressCards.length > 0 ? progressCards[0] : null;
  if (!hasLabel('Resume course') && resumeCard) {
    const fallbackCourseHref = primaryCourse?.courseId
      ? `/dashboard/learner/courses?courseId=${encodeURIComponent(primaryCourse.courseId)}`
      : '/dashboard/learner/courses';
    const resumeHref = sanitiseActionLink(resumeCard.primaryAction?.href) ?? fallbackCourseHref;
    pushAction({
      id: `resume-course-${resumeCard.id ?? 'course'}`,
      label: 'Resume course',
      description: resumeCard.title ? `Continue ${resumeCard.title}` : 'Pick up where you left off.',
      href: resumeHref,
      ctaLabel: resumeCard.primaryAction?.label ?? 'Resume'
    });
  }

  if (!hasLabel('Join live session')) {
    const liveEvent = Array.isArray(upcoming)
      ? upcoming.find((event) => {
          const type = (event.type ?? '').toLowerCase();
          return ['live', 'class', 'session', 'workshop', 'webinar'].some((keyword) =>
            type.includes(keyword)
          );
        })
      : null;

    if (liveEvent) {
      pushAction({
        id: `join-live-${liveEvent.id ?? 'session'}`,
        label: 'Join live session',
        description: liveEvent.title ?? 'Open the live classroom lobby.',
        href: liveEvent.href ?? '/dashboard/learner/live-classes',
        ctaLabel: liveEvent.action ?? 'Join now'
      });
    } else {
      pushAction({
        id: 'join-live-session',
        label: 'Join live session',
        description: 'Open the live classroom lobby for today\'s events.',
        href: '/dashboard/learner/live-classes',
        ctaLabel: 'Open lobby'
      });
    }
  }

  if (!hasLabel('Book a tutor')) {
    pushAction({
      id: 'book-tutor',
      label: 'Book a tutor',
      description: 'Schedule time with a mentor to stay on track.',
      href: '/dashboard/learner/bookings',
      ctaLabel: 'Book session'
    });
  }

  if (!hasLabel('Upload assignment')) {
    const assignmentSummary = dashboard?.courses?.assignments ?? dashboard?.assignments ?? null;
    let assignmentDescription = 'Submit coursework or upload supporting files.';
    if (Array.isArray(assignmentSummary?.upcoming) && assignmentSummary.upcoming.length > 0) {
      const nextAssignment = assignmentSummary.upcoming[0];
      const courseTitle = nextAssignment.course ?? nextAssignment.courseTitle ?? null;
      const dueLabelRaw = nextAssignment.dueLabel ?? nextAssignment.dueDate ?? null;
      let dueLabel = null;
      if (typeof dueLabelRaw === 'string' && dueLabelRaw.trim()) {
        const parsedDate = new Date(dueLabelRaw);
        if (!Number.isNaN(parsedDate.getTime())) {
          dueLabel = parsedDate.toLocaleDateString();
        } else {
          dueLabel = dueLabelRaw;
        }
      }
      assignmentDescription = [
        courseTitle ? `Submit ${courseTitle}` : null,
        dueLabel ? `due ${dueLabel}` : null
      ]
        .filter(Boolean)
        .join(' · ');
    }

    pushAction({
      id: 'upload-assignment',
      label: 'Upload assignment',
      description: assignmentDescription,
      href: '/dashboard/learner/assessments',
      ctaLabel: 'Open workspace'
    });
  }

  return actions;
}

function normaliseFeedHighlights(highlights) {
  if (!Array.isArray(highlights)) return [];
  return highlights
    .filter((highlight) => highlight?.id)
    .map((highlight) => ({
      id: highlight.id,
      time: highlight.time ?? 'Moments ago',
      tags: Array.isArray(highlight.tags) ? highlight.tags : [],
      headline: highlight.headline ?? 'New activity in your network',
      reactions: highlight.reactions ?? 0,
      comments: highlight.comments ?? 0
    }));
}

function normaliseCommunityEngagement(entries) {
  if (!Array.isArray(entries)) return [];
  return entries
    .filter((entry) => entry?.name)
    .map((entry) => ({
      name: entry.name,
      participation: Number.isFinite(entry.participation)
        ? entry.participation
        : Number(entry.participation ?? 0)
    }));
}

function normaliseNotifications(notifications) {
  if (!Array.isArray(notifications)) return [];
  return notifications
    .filter((notification) =>
      notification && notification.id !== undefined && notification.id !== null
    )
    .map((notification) => ({
      id: notification.id,
      title:
        typeof notification.title === 'string' && notification.title.trim().length > 0
          ? notification.title
          : String(notification.title ?? 'Dashboard update'),
      timestamp:
        typeof notification.timestamp === 'string' && notification.timestamp.trim().length > 0
          ? notification.timestamp
          : notification.timestamp instanceof Date
            ? notification.timestamp.toLocaleString()
            : String(notification.timestamp ?? 'Just now'),
      type: notification.type ?? 'update'
    }));
}

function normaliseBlog(blog) {
  if (!blog) {
    return { posts: [], featured: null };
  }
  const posts = Array.isArray(blog.highlights)
    ? blog.highlights.map((post) => ({
        ...post,
        readingTimeMinutes: Number(post.readingTimeMinutes ?? post.reading_time_minutes ?? 0),
        viewCount: Number(post.viewCount ?? post.view_count ?? 0)
      }))
    : [];
  return {
    posts,
    featured: blog.featured ?? null
  };
}

function normaliseProgressCards(courses, goals, promotions) {
  const toKey = (...values) => {
    for (const value of values) {
      if (value !== undefined && value !== null) {
        return String(value);
      }
    }
    return null;
  };

  const goalMap = new Map();
  if (Array.isArray(goals)) {
    goals.forEach((goal) => {
      if (!goal) return;
      const key = toKey(goal.courseId, goal.id, goal.slug, goal.courseSlug);
      if (!key) return;
      goalMap.set(key, goal);
    });
  }

  const promotionMap = new Map();
  if (Array.isArray(promotions)) {
    promotions.forEach((promotion) => {
      if (!promotion) return;
      const key = toKey(promotion.courseId, promotion.id, promotion.slug, promotion.courseSlug);
      if (!key) return;
      promotionMap.set(key, promotion);
    });
  }

  if (!Array.isArray(courses)) {
    return [];
  }

  return courses.slice(0, 3).map((course, index) => {
    const courseKey = toKey(course.courseId, course.id, index);
    const goal = goalMap.get(courseKey) ?? goalMap.get(toKey(course.id, course.courseId)) ?? course.goal ?? null;

    const rawProgress = goal?.progressPercent ?? course.progressPercent ?? course.progress;
    const progressPercent = Number.isFinite(Number(rawProgress))
      ? Math.max(0, Math.min(100, Number(rawProgress)))
      : 0;
    const dueLabel = goal?.dueLabel
      ? goal.dueLabel
      : goal?.dueDate
        ? new Date(goal.dueDate).toLocaleDateString()
        : goal?.metadata?.dueLabel ?? null;
    const nextStep = goal?.nextStep ?? goal?.upNext ?? course?.nextLesson ?? null;
    const goalPriority = Number.isFinite(Number(goal?.priority)) ? Number(goal.priority) : null;

    const promotion =
      promotionMap.get(courseKey) ??
      promotionMap.get(toKey(course.id, course.courseId)) ??
      course.revenueOpportunity ??
      null;

    const actionLabel =
      promotion?.actionLabel ?? promotion?.action?.label ?? promotion?.cta?.label ?? promotion?.ctaLabel ?? null;
    const actionHref =
      sanitiseActionLink(
        promotion?.actionHref ?? promotion?.action?.href ?? promotion?.cta?.href ?? promotion?.ctaHref ?? null
      ) ?? null;

    const revenue = promotion
      ? {
          headline:
            promotion.headline ?? promotion.title ?? promotion.kicker ?? 'Unlock new learning rewards',
          caption: promotion.body ?? promotion.description ?? promotion.caption ?? null,
          action: actionLabel && actionHref ? { label: actionLabel, href: actionHref } : null
        }
      : null;

    const meta = course.lastTouchedLabel
      ? { lastUpdatedLabel: course.lastTouchedLabel }
      : course.lastTouchedAt
        ? { lastUpdatedLabel: new Date(course.lastTouchedAt).toLocaleDateString() }
        : goal?.metadata?.updatedLabel
          ? { lastUpdatedLabel: goal.metadata.updatedLabel }
          : null;

    return {
      id: courseKey ?? `course-${index}`,
      title: course.title ?? 'Course',
      status: goal?.statusLabel ?? goal?.status ?? course.goalStatus ?? course.status ?? 'Active program',
      instructor: course.instructor ?? course.instructorName ?? null,
      progressPercent,
      nextLessonLabel: nextStep,
      goal: goal
        ? {
            statusLabel: goal.status ?? goal.statusLabel ?? null,
            dueLabel,
            focusMinutesPerWeek: Number.isFinite(Number(goal.focusMinutesPerWeek))
              ? Number(goal.focusMinutesPerWeek)
              : null,
            nextStep
          }
        : null,
      primaryAction: {
        label: 'Resume course',
        href: `/dashboard/courses?courseId=${encodeURIComponent(course.courseId ?? course.id ?? courseKey ?? '')}`
      },
      secondaryAction: nextStep
        ? {
            label: 'View modules',
            href: `/dashboard/courses?courseId=${encodeURIComponent(
              course.courseId ?? course.id ?? courseKey ?? ''
            )}#modules`
          }
        : null,
      highlight:
        goalPriority === 1 ||
        (Array.isArray(goal?.tags) && goal.tags.includes('primary')) ||
        promotion?.highlight === true ||
        progressPercent >= 80,
      revenue,
      meta
    };
  });
}

function normaliseGoals(goals) {
  if (!Array.isArray(goals)) {
    return [];
  }

  return goals.map((goal, index) => {
    const progressPercent = Number.isFinite(Number(goal?.progressPercent))
      ? Number(goal.progressPercent)
      : 0;
    const dueLabel = goal?.dueLabel
      ? goal.dueLabel
      : goal?.dueDate
        ? new Date(goal.dueDate).toLocaleDateString()
        : null;

    return {
      id: goal.id ?? goal.courseId ?? `goal-${index}`,
      title: goal.title ?? goal.courseTitle ?? 'Learning goal',
      subtitle: goal.subtitle ?? goal.courseTitle ?? null,
      status: goal.status ?? goal.statusLabel ?? null,
      remainingLessons: Number.isFinite(Number(goal.remainingLessons))
        ? Number(goal.remainingLessons)
        : 0,
      focusMinutesPerWeek: Number.isFinite(Number(goal.focusMinutesPerWeek))
        ? Number(goal.focusMinutesPerWeek)
        : null,
      dueLabel,
      progressPercent
    };
  });
}

function normaliseSurveyPrompt(survey) {
  if (!survey?.id || !survey?.question) {
    return null;
  }

  const options = Array.isArray(survey.options)
    ? survey.options
        .map((option) => {
          const value = option?.value ?? option?.id ?? null;
          if (!value) {
            return null;
          }
          return {
            value,
            label: option.label ?? String(value),
            description: option.description ?? option.caption ?? null
          };
        })
        .filter(Boolean)
    : [];

  if (!options.length) {
    return null;
  }

  return {
    id: survey.id,
    questionId: survey.questionId ?? null,
    question: survey.question,
    description: survey.description ?? null,
    options,
    ctaLabel: survey.ctaLabel ?? 'Share feedback',
    thankYouMessage: survey.thankYouMessage ?? null,
    channel: survey.channel ?? 'learner-dashboard',
    surface: survey.surface ?? 'dashboard.home',
    scale: survey.scale ?? null,
    courseContext: survey.courseContext ?? null,
    suggestedAction: survey.suggestedAction ?? null,
    secondaryAction: survey.secondaryAction
      ? {
          label: survey.secondaryAction.label,
          href: survey.secondaryAction.href
        }
      : null
  };
}

function normalisePromotion(promotion) {
  if (!promotion) {
    return null;
  }
  const headline = promotion.headline ?? promotion.title;
  if (!headline) {
    return null;
  }
  const bullets = Array.isArray(promotion.bullets)
    ? promotion.bullets
    : Array.isArray(promotion.points)
      ? promotion.points
      : null;
  const action = promotion.actionLabel && promotion.actionHref
    ? { label: promotion.actionLabel, href: promotion.actionHref }
    : promotion.action && promotion.action.label && promotion.action.href
      ? { label: promotion.action.label, href: promotion.action.href }
      : null;

  return {
    id: promotion.id ?? promotion.reference ?? headline,
    kicker: promotion.kicker ?? promotion.label ?? null,
    headline,
    body: promotion.body ?? promotion.description ?? null,
    bullets,
    action
  };
}

export default function LearnerOverview({ dashboard, profile, onRefresh }) {
  const metricsSource = dashboard?.metrics;
  const analytics = dashboard?.analytics ?? {};
  const notificationsSource = dashboard?.notifications ?? {};
  const settings = dashboard?.settings ?? {};
  const accessControl = useMemo(() => createSectionAccessControl(dashboard), [dashboard]);

  const progressCards = useMemo(
    () =>
      normaliseProgressCards(
        dashboard?.courses?.active,
        dashboard?.courses?.goals,
        dashboard?.courses?.promotions
      ),
    [dashboard?.courses?.active, dashboard?.courses?.goals, dashboard?.courses?.promotions]
  );
  const metrics = useMemo(() => normaliseMetrics(metricsSource), [metricsSource]);
  const learningPace = useMemo(
    () => normaliseLearningPace(analytics.learningPace),
    [analytics.learningPace]
  );
  const upcoming = useMemo(() => normaliseUpcoming(dashboard?.upcoming), [dashboard?.upcoming]);
  const profileStats = useMemo(() => normaliseMetrics(profile?.stats), [profile?.stats]);
  const goalEntries = useMemo(() => normaliseGoals(dashboard?.courses?.goals), [dashboard?.courses?.goals]);
  const feedHighlights = useMemo(
    () => normaliseFeedHighlights(profile?.feedHighlights),
    [profile?.feedHighlights]
  );
  const communityEngagement = useMemo(
    () => normaliseCommunityEngagement(analytics.communityEngagement),
    [analytics.communityEngagement]
  );
  const notifications = useMemo(
    () => normaliseNotifications(notificationsSource.items),
    [notificationsSource.items]
  );
  const notificationsTotal = Number.isFinite(Number(notificationsSource.total))
    ? Number(notificationsSource.total)
    : notifications.length;
  const blog = useMemo(() => normaliseBlog(dashboard?.blog), [dashboard?.blog]);
  const surveyPrompt = useMemo(
    () => normaliseSurveyPrompt(dashboard?.feedback?.microSurvey),
    [dashboard?.feedback?.microSurvey]
  );
  const revenuePromotion = useMemo(
    () => normalisePromotion(dashboard?.courses?.promotions?.[0] ?? dashboard?.promotions?.[0]),
    [dashboard?.courses?.promotions, dashboard?.promotions]
  );
  const quickActions = useMemo(
    () =>
      normaliseQuickActions({
        progressCards,
        upcoming,
        dashboard
      }),
    [dashboard, progressCards, upcoming]
  );
  const privacySettings = settings.privacy ?? null;
  const messagingSettings = settings.messaging ?? null;
  const followerSummary = dashboard?.followers ?? null;
  const unreadMessages = notificationsSource.unreadMessages ?? 0;

  const handleAddGoal = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.location.assign('/dashboard/courses');
    }
  }, []);

  const handleSurveySubmitted = useCallback(() => {
    onRefresh?.();
  }, [onRefresh]);

  const canViewMetrics = accessControl.canView('learner-metrics');
  const canViewProfile = accessControl.canView('learner-profile');
  const canViewPace = accessControl.canView('learning-pace');
  const canViewCommunity = accessControl.canView('community-engagement');
  const canEditProfile = accessControl.hasRole('learner') && accessControl.canView('profile-editor');
  const canViewVerification = accessControl.canView('verification-status');
  const canViewUpcoming = accessControl.canView('upcoming-commitments');
  const canViewNotifications = accessControl.canView('notifications');
  const canViewFeed = accessControl.canView('feed-highlights');
  const canViewSafety = accessControl.canView('safety-controls');
  const canViewBlog = accessControl.canView('blog');

  return (
    <div className="space-y-10">
      {progressCards.length ? (
        <section className="grid gap-6 xl:grid-cols-3">
          {progressCards.map((card) => (
            <LearnerProgressCard
              key={card.id}
              title={card.title}
              status={card.status}
              instructor={card.instructor}
              progressPercent={card.progressPercent}
              nextLabel={card.nextLessonLabel}
              goal={card.goal}
              primaryAction={card.primaryAction}
              secondaryAction={card.secondaryAction}
              highlight={card.highlight}
              revenue={card.revenue}
              meta={card.meta}
            />
          ))}
        </section>
      ) : null}

      {quickActions.length ? <LearnerQuickActionsSection actions={quickActions} /> : null}

      {canViewMetrics ? <LearnerMetricsSection metrics={metrics} /> : null}

      {goalEntries.length ? (
        <LearnerGoalsSection goals={goalEntries} onAddGoal={handleAddGoal} />
      ) : null}

      {(canViewProfile || canViewPace || canViewCommunity) && (
        <section className="grid gap-6 xl:grid-cols-7">
          {canViewProfile ? (
            <LearnerProfileSection profile={profile} stats={profileStats} className="xl:col-span-4" />
          ) : null}
          {(canViewPace || canViewCommunity) && (
            <div className="grid gap-6 xl:col-span-3">
              {canViewPace ? <LearnerPaceSection pace={learningPace} /> : null}
              {canViewCommunity ? (
                <LearnerCommunityEngagementSection communities={communityEngagement} />
              ) : null}
            </div>
          )}
        </section>
      )}

      {canEditProfile ? <LearnerProfileEditor onProfileUpdated={onRefresh} /> : null}

      {canViewVerification ? (
        <VerificationStatusCard verification={profile?.verification ?? null} onRefresh={onRefresh} />
      ) : null}

      {(surveyPrompt || revenuePromotion) && (
        <section className="grid gap-6 xl:grid-cols-3">
          {surveyPrompt ? (
            <LearnerSurveySection
              survey={surveyPrompt}
              className={revenuePromotion ? 'xl:col-span-2' : 'xl:col-span-3'}
              onSubmitted={handleSurveySubmitted}
            />
          ) : null}
          {revenuePromotion ? <LearnerRevenueBanner promotion={revenuePromotion} /> : null}
        </section>
      )}

      {(canViewUpcoming || canViewNotifications) && (
        <section className="grid gap-6 xl:grid-cols-3">
          {canViewUpcoming ? (
            <LearnerUpcomingSection upcoming={upcoming} className="xl:col-span-2" />
          ) : null}
          {canViewNotifications ? (
            <LearnerNotificationsSection
              notifications={notifications.slice(0, 4)}
              total={notificationsTotal}
              onRefresh={onRefresh}
            />
          ) : null}
        </section>
      )}

      {(canViewFeed || canViewSafety) && (
        <section className="grid gap-6 xl:grid-cols-3">
          {canViewFeed ? (
            <LearnerFeedHighlightsSection highlights={feedHighlights} className="xl:col-span-2" />
          ) : null}
          {canViewSafety ? (
            <LearnerSafetySection
              privacy={privacySettings}
              messaging={messagingSettings}
              followers={followerSummary}
              unreadMessages={unreadMessages}
            />
          ) : null}
        </section>
      )}

      {canViewBlog ? <LearnerBlogSection posts={blog.posts} featured={blog.featured} /> : null}
    </div>
  );
}

LearnerOverview.propTypes = {
  dashboard: PropTypes.object.isRequired,
  profile: PropTypes.object.isRequired,
  onRefresh: PropTypes.func
};

LearnerOverview.defaultProps = {
  onRefresh: null
};
