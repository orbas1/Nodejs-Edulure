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
      action: event.action ?? 'View details'
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

export default function LearnerOverview({ dashboard, profile, onRefresh }) {
  const metrics = useMemo(() => normaliseMetrics(dashboard.metrics), [dashboard.metrics]);
  const learningPace = useMemo(
    () => normaliseLearningPace(dashboard.analytics?.learningPace),
    [dashboard.analytics?.learningPace]
  );
  const upcoming = useMemo(() => normaliseUpcoming(dashboard.upcoming), [dashboard.upcoming]);
  const profileStats = useMemo(() => normaliseMetrics(profile?.stats), [profile?.stats]);
  const feedHighlights = useMemo(
    () => normaliseFeedHighlights(profile?.feedHighlights),
    [profile?.feedHighlights]
  );
  const communityEngagement = useMemo(
    () => normaliseCommunityEngagement(dashboard.analytics?.communityEngagement),
    [dashboard.analytics?.communityEngagement]
  );
  const notifications = useMemo(
    () => normaliseNotifications(dashboard.notifications?.items),
    [dashboard.notifications?.items]
  );
  const notificationsTotal = dashboard.notifications?.total ?? notifications.length;
  const privacySettings = dashboard.settings?.privacy ?? null;
  const messagingSettings = dashboard.settings?.messaging ?? null;
  const followerSummary = dashboard.followers ?? null;
  const unreadMessages = dashboard.notifications?.unreadMessages ?? 0;

  return (
    <div className="space-y-10">
      <LearnerMetricsSection metrics={metrics} />

      <section className="grid gap-6 xl:grid-cols-7">
        <LearnerProfileSection profile={profile} stats={profileStats} className="xl:col-span-4" />
        <div className="grid gap-6 xl:col-span-3">
          <LearnerPaceSection pace={learningPace} />
          <LearnerCommunityEngagementSection communities={communityEngagement} />
        </div>
      </section>

      <VerificationStatusCard verification={profile?.verification ?? null} onRefresh={onRefresh} />

      <section className="grid gap-6 xl:grid-cols-3">
        <LearnerUpcomingSection upcoming={upcoming} className="xl:col-span-2" />
        <LearnerNotificationsSection
          notifications={notifications.slice(0, 4)}
          total={notificationsTotal}
          onRefresh={onRefresh}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <LearnerFeedHighlightsSection highlights={feedHighlights} className="xl:col-span-2" />
        <LearnerSafetySection
          privacy={privacySettings}
          messaging={messagingSettings}
          followers={followerSummary}
          unreadMessages={unreadMessages}
        />
      </section>
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
