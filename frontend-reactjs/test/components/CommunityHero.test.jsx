import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import CommunityHero from '../../src/components/CommunityHero.jsx';

describe('CommunityHero', () => {
  it('renders leave action when permitted', () => {
    const onLeave = vi.fn();
    render(
      <CommunityHero
        community={{
          id: 1,
          name: 'Automation Guild',
          slug: 'automation-guild',
          membership: { status: 'active', role: 'member' },
          stats: { members: 10, resources: 2, posts: 5 },
          metadata: {},
          permissions: { canLeave: true }
        }}
        isLoading={false}
        error={null}
        onJoin={null}
        isJoining={false}
        joinError={null}
        canJoin={true}
        onLeave={onLeave}
        isLeaving={false}
        leaveError={null}
        canLeave
      />
    );

    const leaveButton = screen.getByRole('button', { name: /leave community/i });
    fireEvent.click(leaveButton);
    expect(onLeave).toHaveBeenCalledTimes(1);
  });
});
