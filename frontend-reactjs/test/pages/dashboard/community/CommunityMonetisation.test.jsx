import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import CommunityMonetisation from '../../../../src/pages/dashboard/community/CommunityMonetisation.jsx';

const updateTierMock = vi.fn();
const useAuthMock = vi.fn();

vi.mock('../../../../src/api/communityApi.js', () => ({
  updateCommunityTier: (...args) => updateTierMock(...args)
}));

vi.mock('../../../../src/context/AuthContext.jsx', () => ({
  useAuth: () => useAuthMock()
}));

describe('CommunityMonetisation', () => {
  const dashboard = {
    monetisation: {
      tiers: [
        {
          id: 10,
          communityId: 77,
          name: 'Premium Ops',
          price: '$49/mo',
          members: '42 active',
          churn: '2% churn',
          renewal: 'May 1',
          isActive: true
        }
      ],
      experiments: [],
      insights: []
    }
  };

  beforeEach(() => {
    updateTierMock.mockReset();
    useAuthMock.mockReturnValue({ session: { tokens: { accessToken: 'token' } } });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('toggles a tier between active states', async () => {
    updateTierMock.mockResolvedValue({
      data: {
        id: 10,
        communityId: 77,
        name: 'Premium Ops',
        price: '$49/mo',
        members: '42 active',
        churn: '2% churn',
        renewal: 'May 1',
        isActive: false
      }
    });

    render(<CommunityMonetisation dashboard={dashboard} />);

    fireEvent.click(screen.getByRole('button', { name: /Pause tier/i }));

    await waitFor(() => {
      expect(updateTierMock).toHaveBeenCalled();
    });

    expect(updateTierMock.mock.calls[0][0]).toMatchObject({
      communityId: 77,
      tierId: 10,
      payload: { isActive: false }
    });
    expect(screen.getByText(/Inactive/)).toBeInTheDocument();
  });

  it('blocks tier toggles when no session token is available', async () => {
    useAuthMock.mockReturnValue({ session: null });

    render(<CommunityMonetisation dashboard={dashboard} />);

    fireEvent.click(screen.getByRole('button', { name: /Pause tier/i }));

    await waitFor(() => {
      expect(updateTierMock).not.toHaveBeenCalled();
    });
    expect(screen.getByRole('alert')).toHaveTextContent('You must be signed in to manage tiers.');
  });
});
