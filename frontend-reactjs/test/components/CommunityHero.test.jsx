import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import CommunityHero from '../../src/components/CommunityHero.jsx';

const baseCommunity = {
  id: 1,
  name: 'Automation Guild',
  slug: 'automation-guild',
  description: 'Where operations pros level up.',
  stats: { members: 10, resources: 2, posts: 5 },
  metadata: { tagline: 'Scale responsibly.' }
};

describe('CommunityHero', () => {
  it('renders loading, empty, and error states safely', () => {
    const { rerender, container } = render(<CommunityHero isLoading />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();

    rerender(<CommunityHero error="Failed to load" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Failed to load');

    rerender(<CommunityHero community={null} />);
    expect(
      screen.getByText(/Select a community to unlock tailored updates/i)
    ).toBeInTheDocument();
  });

  it('exposes the join flow only when participation is allowed', () => {
    const handleJoin = vi.fn();
    const { rerender } = render(
      <CommunityHero
        community={baseCommunity}
        onJoin={handleJoin}
        canJoin
        isJoining={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /join community/i }));
    expect(handleJoin).toHaveBeenCalledTimes(1);

    const disabledReason = 'Only available to verified operators.';
    rerender(
      <CommunityHero
        community={baseCommunity}
        onJoin={handleJoin}
        canJoin={false}
        joinDisabledReason={disabledReason}
      />
    );

    const disabledButton = screen.getByRole('button', { name: /join unavailable/i });
    expect(disabledButton).toBeDisabled();
    expect(screen.getByText(disabledReason)).toBeVisible();
  });

  it('surfaces membership state and handles leave transitions', () => {
    const onLeave = vi.fn();
    const { rerender } = render(
      <CommunityHero
        community={{
          ...baseCommunity,
          membership: { status: 'active', role: 'Moderator' }
        }}
        onLeave={onLeave}
        canLeave
      />
    );

    expect(screen.getByText(/You’re a member/i)).toBeInTheDocument();
    const leaveButton = screen.getByRole('button', { name: /leave community/i });
    fireEvent.click(leaveButton);
    expect(onLeave).toHaveBeenCalledTimes(1);

    rerender(
      <CommunityHero
        community={{
          ...baseCommunity,
          membership: { status: 'active', role: 'Moderator' }
        }}
        onLeave={onLeave}
        canLeave
        isLeaving
        leaveError="Unable to process"
      />
    );

    expect(screen.getByRole('button', { name: /leaving…/i })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('Unable to process');

    rerender(
      <CommunityHero
        community={baseCommunity}
        onJoin={() => {}}
        joinError="Join failed"
      />
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Join failed');
  });

  it('links through to the live community hub safely', () => {
    render(<CommunityHero community={baseCommunity} />);

    const hubLink = screen.getByRole('link', { name: /visit hub/i });
    expect(hubLink).toHaveAttribute('href', 'https://app.edulure.com/communities/automation-guild');
  });

  it('formats activity insights and hides member controls when unavailable', () => {
    render(
      <CommunityHero
        community={{
          ...baseCommunity,
          stats: { members: 12400, resources: 8, posts: 112 },
          membership: null
        }}
      />
    );

    expect(screen.getByText('12,400')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /join community/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /leave community/i })).not.toBeInTheDocument();
  });
});
