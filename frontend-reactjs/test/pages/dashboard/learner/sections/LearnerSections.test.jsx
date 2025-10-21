import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import LearnerBlogSection from '../../../../../src/pages/dashboard/learner/sections/LearnerBlogSection.jsx';
import LearnerCommunityEngagementSection from '../../../../../src/pages/dashboard/learner/sections/LearnerCommunityEngagementSection.jsx';
import LearnerFeedHighlightsSection from '../../../../../src/pages/dashboard/learner/sections/LearnerFeedHighlightsSection.jsx';
import LearnerMetricsSection from '../../../../../src/pages/dashboard/learner/sections/LearnerMetricsSection.jsx';
import LearnerNotificationsSection from '../../../../../src/pages/dashboard/learner/sections/LearnerNotificationsSection.jsx';
import LearnerPaceSection from '../../../../../src/pages/dashboard/learner/sections/LearnerPaceSection.jsx';
import LearnerSafetySection from '../../../../../src/pages/dashboard/learner/sections/LearnerSafetySection.jsx';
import LearnerUpcomingSection from '../../../../../src/pages/dashboard/learner/sections/LearnerUpcomingSection.jsx';

const noop = () => {};

describe('Learner dashboard sections', () => {
  it('renders metrics cards when metrics provided', () => {
    render(
      <LearnerMetricsSection
        metrics={[
          { label: 'Assignments completed', value: '8', change: '12%', trend: 'up' },
          { label: 'Communities', value: '4' }
        ]}
      />
    );

    expect(screen.getByText(/assignments completed/i)).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('renders pace bars and formats time', () => {
    render(
      <LearnerPaceSection
        pace={[
          { label: 'Mon', minutes: 90 },
          { label: 'Tue', minutes: 45 }
        ]}
      />
    );

    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('1 hr 30 min')).toBeInTheDocument();
  });

  it('shows engagement percentages scaled', () => {
    render(
      <LearnerCommunityEngagementSection
        communities={[
          { name: 'Strategy Lab', participation: 30 },
          { name: 'Growth Pod', participation: 15 }
        ]}
      />
    );

    expect(screen.getByText(/strategy lab/i)).toBeInTheDocument();
    expect(screen.getByText(/30 touchpoints/i)).toBeInTheDocument();
  });

  it('presents upcoming events with actions', () => {
    render(
      <LearnerUpcomingSection
        upcoming={[
          { id: 1, type: 'Workshop', date: 'Today', title: 'Live cohort', host: 'Alex', action: 'Join session' }
        ]}
      />
    );

    expect(screen.getByRole('button', { name: /join session/i })).toBeInTheDocument();
  });

  it('renders notifications and allows refresh', () => {
    render(
      <LearnerNotificationsSection
        notifications={[
          { id: 1, title: 'New assignment', timestamp: 'Now', type: 'learning' }
        ]}
        total={3}
        onRefresh={noop}
      />
    );

    expect(screen.getByText(/3 open/i)).toBeInTheDocument();
    expect(screen.getByText(/new assignment/i)).toBeInTheDocument();
  });

  it('shows feed highlights with reactions', () => {
    render(
      <LearnerFeedHighlightsSection
        highlights={[
          { id: 1, time: 'Just now', tags: ['Community'], headline: 'New note', reactions: 5, comments: 2 }
        ]}
      />
    );

    expect(screen.getByText(/new note/i)).toBeInTheDocument();
    expect(screen.getByText(/❤️ 5/)).toBeInTheDocument();
  });

  it('summarises safety posture across cards', () => {
    render(
      <LearnerSafetySection
        privacy={{ visibility: 'followers', followApprovalRequired: true, shareActivity: true, messagePermission: 'everyone' }}
        messaging={{ notificationsEnabled: false }}
        followers={{ followers: 10, following: 4, pending: [1], outgoing: [] }}
        unreadMessages={1}
      />
    );

    expect(screen.getByText(/privacy controls/i)).toBeInTheDocument();
    expect(screen.getByText(/followers only/i)).toBeInTheDocument();
    expect(screen.getByText(/1 unread messages/i)).toBeInTheDocument();
  });

  it('displays blog spotlight and list', () => {
    render(
      <MemoryRouter>
        <LearnerBlogSection
          posts={[
            { slug: 'ops', title: 'Ops guide', category: { name: 'Playbook' }, readingTimeMinutes: 5 },
            { slug: 'leadership', title: 'Leading cohorts', category: { name: 'Leadership' }, readingTimeMinutes: 6 }
          ]}
          featured={{ slug: 'ops', title: 'Ops guide', readingTimeMinutes: 5 }}
        />
      </MemoryRouter>
    );

    expect(screen.getByText(/latest platform stories/i)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /read article/i })).toHaveLength(1);
  });
});
