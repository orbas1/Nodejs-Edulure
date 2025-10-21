import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import CommunitySwitcher from '../CommunitySwitcher.jsx';
import FeedCard from '../FeedCard.jsx';
import FeedComposer from '../FeedComposer.jsx';
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
});

describe('FeedCard', () => {
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

    render(<FeedCard post={post} />);

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

    render(<FeedCard post={post} onModerate={handleModerate} />);

    await user.click(screen.getByRole('button', { name: /suppress/i }));
    expect(handleModerate).toHaveBeenCalledWith(post, 'suppress');
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

    await user.click(screen.getByRole('button', { name: /share something/i }));

    fireEvent.change(screen.getByLabelText(/what would you like to share/i), {
      target: { value: 'This is a rich update for our community members.' }
    });

    await user.click(screen.getByRole('button', { name: /publish update/i }));

    await waitFor(() => {
      expect(createCommunityPost).toHaveBeenCalledWith(
        expect.objectContaining({
          communityId: '101',
          payload: expect.objectContaining({ body: expect.stringContaining('rich update') })
        })
      );
    });

    expect(await screen.findByText(/update shared with your community/i)).toBeInTheDocument();
    expect(onPostCreated).toHaveBeenCalledWith({ id: 'post-123' });
    expect(screen.getByRole('button', { name: /share something/i })).toBeInTheDocument();
  });
});
