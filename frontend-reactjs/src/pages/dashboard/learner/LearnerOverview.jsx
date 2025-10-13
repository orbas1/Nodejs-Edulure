import PropTypes from 'prop-types';

import LearnerFeedHighlightsSection from './sections/LearnerFeedHighlightsSection.jsx';
import LearnerMetricsSection from './sections/LearnerMetricsSection.jsx';
import LearnerPaceSection from './sections/LearnerPaceSection.jsx';
import LearnerProfileSection from './sections/LearnerProfileSection.jsx';
import LearnerUpcomingSection from './sections/LearnerUpcomingSection.jsx';

export default function LearnerOverview({ dashboard, profile }) {
  const metrics = dashboard.metrics ?? [];
  const learningPace = (dashboard.analytics?.learningPace ?? []).map((entry) => ({
    label: entry.day,
    value: `${entry.minutes}m`
  }));
  const upcoming = dashboard.upcoming ?? [];
  const profileStats = profile?.stats ?? [];
  const feedHighlights = profile?.feedHighlights ?? [];

  return (
    <div className="space-y-10">
      <LearnerMetricsSection metrics={metrics} />

      <section className="grid gap-6 lg:grid-cols-5">
        <LearnerProfileSection profile={profile} stats={profileStats} />
        <LearnerPaceSection pace={learningPace} />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <LearnerUpcomingSection upcoming={upcoming} />
        <LearnerFeedHighlightsSection highlights={feedHighlights} />
      </section>
    </div>
  );
}

LearnerOverview.propTypes = {
  dashboard: PropTypes.object.isRequired,
  profile: PropTypes.object.isRequired
};
