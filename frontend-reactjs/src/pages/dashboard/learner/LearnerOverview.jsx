import { useMemo } from 'react';
import PropTypes from 'prop-types';

import VerificationStatusCard from '../../../components/dashboard/VerificationStatusCard.jsx';
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

export default function LearnerOverview({ dashboard, profile, onRefresh }) {
  const metricsSource = dashboard?.metrics;
  const analytics = dashboard?.analytics ?? {};
  const notificationsSource = dashboard?.notifications ?? {};
  const settings = dashboard?.settings ?? {};
  const accessControl = useMemo(() => createSectionAccessControl(dashboard), [dashboard]);

  const metrics = useMemo(() => normaliseMetrics(metricsSource), [metricsSource]);
  const learningPace = useMemo(
    () => normaliseLearningPace(analytics.learningPace),
    [analytics.learningPace]
  );
  const upcoming = useMemo(() => normaliseUpcoming(dashboard?.upcoming), [dashboard?.upcoming]);
  const profileStats = useMemo(() => normaliseMetrics(profile?.stats), [profile?.stats]);
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
  const privacySettings = settings.privacy ?? null;
  const messagingSettings = settings.messaging ?? null;
  const followerSummary = dashboard?.followers ?? null;
  const unreadMessages = notificationsSource.unreadMessages ?? 0;

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
      {canViewMetrics ? <LearnerMetricsSection metrics={metrics} /> : null}

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
