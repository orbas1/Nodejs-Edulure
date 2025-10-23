import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import CommunityHero from '../CommunityHero.jsx';
import CommunityProfile from '../CommunityProfile.jsx';
import CommunitySwitcher from '../CommunitySwitcher.jsx';
import FeedItemCard from '../feed/FeedItemCard.jsx';
import FeedComposer from '../feed/Composer.jsx';
import SponsoredCard from '../feed/SponsoredCard.jsx';
import { AuthContext } from '../../context/AuthContext.jsx';

vi.mock('../../api/communityApi.js', () => ({
  createCommunityPost: vi.fn()
}));

const { createCommunityPost } = await import('../../api/communityApi.js');

function renderWithAuth(ui, sessionOverrides = {}) {
  const contextValue = {
    session: {
      user: { name: 'Jordan Operator', email: 'jordan@example.com', avatarUrl: null },
      tokens: { accessToken: 'token-123' },
      ...sessionOverrides
    },
    isAuthenticated: true
  };

  return render(<AuthContext.Provider value={contextValue}>{ui}</AuthContext.Provider>);
}

describe('CommunitySwitcher', () => {
  it('calls onSelect when a community is chosen', async () => {
    const user = userEvent.setup();
    const communities = [
      { id: '1', name: 'All communities', description: 'Overview' },
      { id: '2', name: 'Launch Crew', description: 'Go-to-market operators' }
    ];
    const handleSelect = vi.fn();

    render(
      <CommunitySwitcher communities={communities} selected={communities[0]} onSelect={handleSelect} />
    );

    await user.click(screen.getByRole('button', { name: /all communities/i }));
    await user.click(screen.getByRole('menuitem', { name: /launch crew/i }));

    expect(handleSelect).toHaveBeenCalledWith(communities[1]);
  });

  it('shows a placeholder when there are no communities', async () => {
    const user = userEvent.setup();
    render(<CommunitySwitcher communities={[]} onSelect={() => {}} />);

    await user.click(screen.getByRole('button'));
    expect(screen.getByText(/no communities available/i)).toBeInTheDocument();
  });

  it('filters communities via the search input when enabled', async () => {
    const user = userEvent.setup();
    const communities = [
      { id: '1', name: 'All communities', description: 'Overview' },
      { id: '2', name: 'Launch Crew', description: 'Go-to-market operators' },
      { id: '3', name: 'Design Lab', description: 'Experience team' }
    ];
    render(
      <CommunitySwitcher
        communities={communities}
        selected={communities[0]}
        onSelect={() => {}}
        enableSearch
      />
    );

    await user.click(screen.getByRole('button', { name: /all communities/i }));
    await user.type(screen.getByPlaceholderText(/search communities/i), 'design');
    expect(screen.getByText(/design lab/i)).toBeInTheDocument();
    expect(screen.queryByText(/launch crew/i)).not.toBeInTheDocument();
  });
});

describe('FeedItemCard', () => {
  it('renders fallback initials when avatar is missing', () => {
    const post = {
      id: 'post-1',
      body: 'Excited to share our latest module!',
      publishedAt: new Date().toISOString(),
      tags: ['launch'],
      stats: { reactions: 12, comments: 3 },
      author: { id: 'user-1', name: 'Taylor Swift', avatarUrl: null },
      permissions: {},
      community: { id: 'c1', name: 'Launch Crew' }
    };

    render(<FeedItemCard post={post} />);

    expect(screen.getByText('TS')).toBeInTheDocument();
    expect(screen.getByText(/excited to share/i)).toBeInTheDocument();
  });

  it('surfaces moderation controls when permitted', async () => {
    const user = userEvent.setup();
    const handleModerate = vi.fn();
    const post = {
      id: 'post-2',
      body: 'Please review the new SOP draft.',
      publishedAt: new Date().toISOString(),
      author: { id: 'user-2', name: 'Morgan Lee', avatarUrl: null },
      permissions: { canModerate: true },
      stats: { reactions: 0, comments: 0 }
    };

    render(<FeedItemCard post={post} onModerate={handleModerate} />);

    await user.click(screen.getByRole('button', { name: /suppress/i }));
    expect(handleModerate).toHaveBeenCalledWith(post, 'suppress');
  });

  it('flags when a post is suppressed', () => {
    const post = {
      id: 'post-3',
      body: 'Content pending moderation.',
      publishedAt: new Date().toISOString(),
      author: { id: 'user-3', name: 'Charlie Ops', avatarUrl: null },
      permissions: {},
      moderation: { state: 'suppressed', reason: 'awaiting review' },
      stats: { reactions: 1, comments: 0 }
    };

    render(<FeedItemCard post={post} />);

    expect(screen.getByText(/post is hidden from members/i)).toBeInTheDocument();
    expect(screen.getByText(/reason: awaiting review/i)).toBeInTheDocument();
  });

  it('renders link attachments when available', () => {
    const post = {
      id: 'post-4',
      body: 'Check the new runbook.',
      publishedAt: new Date().toISOString(),
      author: { id: 'user-4', name: 'Jordan Ops', avatarUrl: null },
      metadata: {
        attachments: [{ id: 'att-1', type: 'link', url: 'https://edulure.com/runbook', label: 'Runbook' }]
      },
      stats: { reactions: 0, comments: 0 }
    };

    render(<FeedItemCard post={post} />);

    expect(screen.getByRole('link', { name: /visit runbook/i })).toHaveAttribute('href', 'https://edulure.com/runbook');
  });
});

describe('FeedComposer', () => {
  beforeEach(() => {
    createCommunityPost.mockReset();
  });

  it('displays maintenance message when disabled', () => {
    renderWithAuth(<FeedComposer communities={[]} disabled />);
    expect(
      screen.getByText(/feed composer is currently disabled for maintenance/i)
    ).toBeInTheDocument();
  });

  it('submits a post and resets the form on success', async () => {
    const onPostCreated = vi.fn();
    const user = userEvent.setup();
    const communities = [
      { id: '101', name: 'Ops Guild', permissions: { canCreatePosts: true } }
    ];

    createCommunityPost.mockResolvedValueOnce({ data: { id: 'post-123' } });

    renderWithAuth(
      <FeedComposer
        communities={communities}
        defaultCommunityId="101"
        onPostCreated={onPostCreated}
      />
    );

    await user.click(screen.getByRole('button', { name: /start typing/i }));

    fireEvent.change(screen.getByLabelText(/share the update/i), {
      target: { value: 'This is a rich update for our community members.' }
    });

    fireEvent.change(screen.getByLabelText(/attach a link/i), {
      target: { value: 'https://edulure.com/update' }
    });

    await user.click(screen.getByRole('button', { name: /publish update/i }));

    await waitFor(() => {
      expect(createCommunityPost).toHaveBeenCalledWith(
        expect.objectContaining({
          communityId: '101',
          payload: expect.objectContaining({
            body: expect.stringContaining('rich update'),
            metadata: expect.objectContaining({
              attachments: [expect.objectContaining({ url: 'https://edulure.com/update' })]
            })
          })
        })
      );
    });

    expect(await screen.findByText(/update shared with ops guild/i)).toBeInTheDocument();
    expect(onPostCreated).toHaveBeenCalledWith({ id: 'post-123' });
    expect(screen.getByRole('button', { name: /start typing/i })).toBeInTheDocument();
  });

  it('surfaces permission errors and deduplicates tags', async () => {
    const user = userEvent.setup();
    const communities = [{ id: '201', name: 'Creators', permissions: { canCreatePosts: true } }];

    createCommunityPost.mockRejectedValueOnce({ response: { status: 403 } });

    renderWithAuth(
      <FeedComposer
        communities={communities}
        defaultCommunityId="201"
        onPostCreated={() => {}}
      />
    );

    await user.click(screen.getByRole('button', { name: /start typing/i }));
    fireEvent.change(screen.getByLabelText(/share the update/i), {
      target: { value: 'Short update that will be rejected by permissions.' }
    });
    fireEvent.change(screen.getByLabelText(/tags \(comma separated\)/i), {
      target: { value: 'Ops, ops, Launch' }
    });

    fireEvent.change(screen.getByLabelText(/attach a link/i), {
      target: { value: 'https://edulure.com/update' }
    });

    await user.click(screen.getByRole('button', { name: /publish update/i }));

    await waitFor(() => {
      expect(createCommunityPost).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({ tags: ['Ops', 'Launch'] })
        })
      );
    });

    expect(
      await screen.findByText(/do not have permission to publish in this community/i)
    ).toBeInTheDocument();
  });

  it('prevents submission when the link protocol is unsupported', async () => {
    const user = userEvent.setup();
    const communities = [{ id: '301', name: 'Ops Circle', permissions: { canCreatePosts: true } }];

    renderWithAuth(
      <FeedComposer communities={communities} defaultCommunityId="301" onPostCreated={() => {}} />
    );

    await user.click(screen.getByRole('button', { name: /start typing/i }));

    fireEvent.change(screen.getByLabelText(/share the update/i), {
      target: { value: 'Security update for the ops circle.' }
    });

    fireEvent.change(screen.getByLabelText(/attach a link/i), {
      target: { value: 'javascript:alert(1)' }
    });

    await user.click(screen.getByRole('button', { name: /publish update/i }));

    expect(await screen.findByText(/please provide a valid url/i)).toBeInTheDocument();
    expect(createCommunityPost).not.toHaveBeenCalled();
  });

  it('honours visibility options defined by the community', async () => {
    const user = userEvent.setup();
    const communities = [
      {
        id: '401',
        name: 'Ops Guild',
        permissions: { canCreatePosts: true, visibilityOptions: ['members', 'admins'] }
      }
    ];

    renderWithAuth(
      <FeedComposer communities={communities} defaultCommunityId="401" onPostCreated={() => {}} />
    );

    await user.click(screen.getByRole('button', { name: /start typing/i }));

    const visibilitySelect = screen.getByLabelText(/visibility/i);
    const optionLabels = within(visibilitySelect)
      .getAllByRole('option')
      .map((option) => option.textContent);

    expect(optionLabels).toEqual(['Members', 'Admins']);
    expect(visibilitySelect).toHaveValue('members');
  });
});

describe('CommunityHero', () => {
  it('shows membership status messaging for pending approvals', () => {
    const community = {
      id: 'c-1',
      name: 'Ops Collective',
      slug: 'ops-collective',
      membership: { status: 'pending' },
      stats: { members: 10, resources: 3, posts: 1 }
    };

    render(
      <CommunityHero
        community={community}
        canJoin={false}
        joinDisabledReason="Awaiting approval"
      />
    );

    expect(screen.getByText(/pending approval/i)).toBeInTheDocument();
    expect(screen.getByText(/awaiting approval/i)).toBeInTheDocument();
  });

  it('omits event CTAs with unsupported protocols', () => {
    const community = {
      id: 'c-2',
      name: 'Creators',
      slug: 'creators',
      membership: { status: 'active', role: 'Member' },
      stats: { members: 10, resources: 2, posts: 1 },
      nextEvent: {
        title: 'Town Hall',
        scheduledAt: new Date('2024-04-01T10:00:00Z').toISOString(),
        cta: { label: 'Join call', href: 'javascript:alert(1)', external: true }
      }
    };

    render(<CommunityHero community={community} canJoin={false} />);

    expect(screen.getByText(/town hall/i)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /join call/i })).not.toBeInTheDocument();
  });
});

describe('CommunityProfile', () => {
  it('suppresses unsafe embeds while keeping safe resource links', () => {
    const community = { id: 'c-3', name: 'Ops Circle', slug: 'ops-circle' };
    const resources = [
      {
        id: 'r-1',
        title: 'Ops Checklist',
        description: 'Monthly checklist',
        resourceType: 'document',
        linkUrl: 'https://edulure.com/resources/ops-checklist',
        metadata: { embedUrl: 'javascript:alert(1)' }
      }
    ];

    render(
      <CommunityProfile
        community={community}
        resources={resources}
        resourcesMeta={{ total: 1 }}
        isAggregate={false}
      />
    );

    expect(screen.queryByTitle(/ops checklist preview/i)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /visit edulure.com/i })).toHaveAttribute(
      'href',
      'https://edulure.com/resources/ops-checklist'
    );
  });
});

describe('SponsoredCard', () => {
  it('does not render CTA buttons when url is unsafe', () => {
    const ad = {
      placementId: 'slot-1',
      headline: 'Scale with Ops Services',
      advertiser: 'Ops Partner',
      ctaUrl: 'javascript:alert(1)',
      position: 3,
      metrics: { clicks: 12 }
    };

    render(<SponsoredCard ad={ad} />);

    expect(screen.queryByRole('link', { name: /visit/i })).not.toBeInTheDocument();
  });
});
