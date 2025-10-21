import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import LearnerOverview from '../../../../src/pages/dashboard/learner/LearnerOverview.jsx';

const metricsSpy = vi.fn();
const paceSpy = vi.fn();
const communitySpy = vi.fn();
const feedSpy = vi.fn();
const profileSpy = vi.fn();
const notificationsSpy = vi.fn();
const upcomingSpy = vi.fn();
const safetySpy = vi.fn();
const blogSpy = vi.fn();

vi.mock('../../../../src/components/dashboard/VerificationStatusCard.jsx', () => ({
  default: vi.fn(() => <div data-testid="verification-card" />)
}));

vi.mock('../../../../src/pages/dashboard/learner/sections/LearnerMetricsSection.jsx', () => ({
  default: vi.fn((props) => {
    metricsSpy(props);
    return <div data-testid="metrics-section" />;
  })
}));

vi.mock('../../../../src/pages/dashboard/learner/sections/LearnerPaceSection.jsx', () => ({
  default: vi.fn((props) => {
    paceSpy(props);
    return <div data-testid="pace-section" />;
  })
}));

vi.mock('../../../../src/pages/dashboard/learner/sections/LearnerCommunityEngagementSection.jsx', () => ({
  default: vi.fn((props) => {
    communitySpy(props);
    return <div data-testid="community-section" />;
  })
}));

vi.mock('../../../../src/pages/dashboard/learner/sections/LearnerFeedHighlightsSection.jsx', () => ({
  default: vi.fn((props) => {
    feedSpy(props);
    return <div data-testid="feed-section" />;
  })
}));

vi.mock('../../../../src/pages/dashboard/learner/sections/LearnerProfileSection.jsx', () => ({
  default: vi.fn((props) => {
    profileSpy(props);
    return <div data-testid="profile-section" />;
  })
}));

vi.mock('../../../../src/pages/dashboard/learner/sections/LearnerNotificationsSection.jsx', () => ({
  default: vi.fn((props) => {
    notificationsSpy(props);
    return <div data-testid="notifications-section" />;
  })
}));

vi.mock('../../../../src/pages/dashboard/learner/sections/LearnerUpcomingSection.jsx', () => ({
  default: vi.fn((props) => {
    upcomingSpy(props);
    return <div data-testid="upcoming-section" />;
  })
}));

vi.mock('../../../../src/pages/dashboard/learner/sections/LearnerSafetySection.jsx', () => ({
  default: vi.fn((props) => {
    safetySpy(props);
    return <div data-testid="safety-section" />;
  })
}));

vi.mock('../../../../src/pages/dashboard/learner/sections/LearnerBlogSection.jsx', () => ({
  default: vi.fn((props) => {
    blogSpy(props);
    return <div data-testid="blog-section" />;
  })
}));

vi.mock('../../../../src/pages/dashboard/learner/sections/LearnerProfileEditor.jsx', () => ({
  default: vi.fn(() => <div data-testid="profile-editor" />)
}));

describe('LearnerOverview', () => {
  const dashboard = {
    metrics: [
      { label: 'Modules completed', value: 12, change: '12%', trend: 'up' },
      { label: 'Sessions attended', value: 8 }
    ],
    analytics: {
      learningPace: [
        { label: 'Mon', minutes: 45 },
        { label: 'Tue', minutes: '30' }
      ],
      communityEngagement: [
        { name: 'Product Ops', participation: '12' },
        { name: 'Strategy Lab', participation: 20 }
      ]
    },
    upcoming: [
      { id: 1, type: 'Mentor', date: 'Tomorrow', title: 'Mentor sync', host: 'Iris', action: 'Join session' }
    ],
    notifications: {
      items: [
        { id: 'n-1', title: 'Assignment graded', timestamp: '1h ago', type: 'learning' },
        { id: 'n-2', title: 'New follower', timestamp: new Date('2024-01-01T00:00:00Z'), type: 'social' }
      ],
      total: 6,
      unreadMessages: 2
    },
    blog: {
      highlights: [
        { slug: 'insights', title: 'Future of learning', reading_time_minutes: 7, view_count: 120 }
      ],
      featured: { slug: 'spotlight', title: 'Learning spotlight', readingTimeMinutes: 4 }
    },
    settings: {
      privacy: { visibility: 'followers' },
      messaging: { notificationsEnabled: true }
    },
    followers: { followers: 12, following: 6 }
  };

  const profile = {
    stats: [
      { label: 'Badges', value: 4 },
      { label: 'Communities', value: 3 }
    ],
    feedHighlights: [
      { id: 'h-1', headline: 'Posted a new note', time: 'Just now', tags: ['Community'], reactions: 4, comments: 2 }
    ],
    verification: { status: 'verified' }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('normalises dashboard data before rendering sections', () => {
    render(<LearnerOverview dashboard={dashboard} profile={profile} onRefresh={vi.fn()} />);

    expect(metricsSpy).toHaveBeenCalledWith({
      metrics: [
        { label: 'Modules completed', value: 12, change: '12%', trend: 'up' },
        { label: 'Sessions attended', value: 8 }
      ]
    });

    expect(paceSpy).toHaveBeenCalledWith({
      pace: [
        { label: 'Mon', minutes: 45 },
        { label: 'Tue', minutes: 30 }
      ]
    });

    expect(communitySpy).toHaveBeenCalledWith({
      communities: [
        { name: 'Product Ops', participation: 12 },
        { name: 'Strategy Lab', participation: 20 }
      ]
    });

    expect(notificationsSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        notifications: [
          { id: 'n-1', title: 'Assignment graded', timestamp: '1h ago', type: 'learning' },
          expect.objectContaining({ title: 'New follower', type: 'social' })
        ],
        total: 6
      })
    );

    expect(feedSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        highlights: [
          { id: 'h-1', headline: 'Posted a new note', time: 'Just now', tags: ['Community'], reactions: 4, comments: 2 }
        ]
      })
    );

    expect(profileSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        profile,
        stats: [
          { label: 'Badges', value: 4 },
          { label: 'Communities', value: 3 }
        ]
      })
    );

    expect(upcomingSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        upcoming: [
          {
            id: 1,
            type: 'Mentor',
            date: 'Tomorrow',
            title: 'Mentor sync',
            host: 'Iris',
            action: 'Join session',
            href: null
          }
        ]
      })
    );

    expect(blogSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        posts: [
          expect.objectContaining({
            slug: 'insights',
            title: 'Future of learning',
            readingTimeMinutes: 7,
            viewCount: 120
          })
        ],
        featured: { slug: 'spotlight', title: 'Learning spotlight', readingTimeMinutes: 4 }
      })
    );

    expect(safetySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        privacy: { visibility: 'followers' },
        messaging: { notificationsEnabled: true },
        followers: { followers: 12, following: 6 },
        unreadMessages: 2
      })
    );

    expect(screen.getByTestId('verification-card')).toBeInTheDocument();
    expect(screen.getByTestId('profile-editor')).toBeInTheDocument();
  });

  it('renders gracefully when lists are missing', () => {
    render(
      <LearnerOverview
        dashboard={{}}
        profile={{}}
      />
    );

    expect(screen.getByTestId('verification-card')).toBeInTheDocument();
    expect(metricsSpy).toHaveBeenCalledWith({ metrics: [] });
    expect(paceSpy).toHaveBeenCalledWith({ pace: [] });
    expect(communitySpy).toHaveBeenCalledWith({ communities: [] });
    expect(notificationsSpy).toHaveBeenCalledWith(expect.objectContaining({ notifications: [], total: 0 }));
    expect(feedSpy).toHaveBeenCalledWith(expect.objectContaining({ highlights: [] }));
    expect(blogSpy).toHaveBeenCalledWith({ posts: [], featured: null });
    expect(profileSpy).toHaveBeenCalledWith(expect.objectContaining({ profile: {}, stats: [] }));
  });

  it('respects section visibility settings', () => {
    render(
      <LearnerOverview
        dashboard={{
          access: {
            allowedSections: ['notifications'],
            blockedSections: ['metrics', 'profile', 'upcoming-commitments', 'blog']
          },
          notifications: { items: [], total: 0 }
        }}
        profile={{}}
      />
    );

    expect(metricsSpy).not.toHaveBeenCalled();
    expect(profileSpy).not.toHaveBeenCalled();
    expect(paceSpy).not.toHaveBeenCalled();
    expect(communitySpy).not.toHaveBeenCalled();
    expect(upcomingSpy).not.toHaveBeenCalled();
    expect(feedSpy).not.toHaveBeenCalled();
    expect(blogSpy).not.toHaveBeenCalled();
    expect(safetySpy).not.toHaveBeenCalled();
    expect(screen.queryByTestId('profile-editor')).not.toBeInTheDocument();
    expect(notificationsSpy).toHaveBeenCalled();
  });
});
