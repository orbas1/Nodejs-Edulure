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

function normaliseProgressCards(courses, goals) {
  const goalMap = new Map();
  if (Array.isArray(goals)) {
    goals.forEach((goal) => {
      if (!goal) return;
      const key = goal.courseId ?? goal.id ?? goal.slug ?? null;
      if (!key) return;
      goalMap.set(key, goal);
    });
  }

  if (!Array.isArray(courses)) {
    return [];
  }

  return courses.slice(0, 3).map((course, index) => {
    const goal = goalMap.get(course.courseId ?? course.id) ?? null;
    const progressPercent = Number.isFinite(Number(goal?.progressPercent ?? course.progress))
      ? Number(goal?.progressPercent ?? course.progress)
      : 0;
    const dueLabel = goal?.dueLabel
      ? goal.dueLabel
      : goal?.dueDate
        ? new Date(goal.dueDate).toLocaleDateString()
        : null;
    const nextStep = goal?.nextStep ?? goal?.upNext ?? course?.nextLesson ?? null;

    return {
      id: course.id ?? course.courseId ?? `course-${index}`,
      title: course.title ?? 'Course',
      status: course.status ?? 'Active',
      instructor: course.instructor ?? null,
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
        href: `/dashboard/courses?courseId=${encodeURIComponent(course.courseId ?? course.id ?? '')}`
      },
      secondaryAction: nextStep
        ? {
            label: 'View modules',
            href: `/dashboard/courses?courseId=${encodeURIComponent(course.courseId ?? course.id ?? '')}#modules`
          }
        : null,
      highlight:
        goal?.priority === 1 ||
        (typeof goal?.status === 'string' && goal.status.toLowerCase().includes('focus')),
      revenue: course.revenueOpportunity ?? null,
      meta: course.lastTouchedLabel ? { lastUpdatedLabel: course.lastTouchedLabel } : null
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
    () => normaliseProgressCards(dashboard?.courses?.active, dashboard?.courses?.goals),
    [dashboard?.courses?.active, dashboard?.courses?.goals]
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
