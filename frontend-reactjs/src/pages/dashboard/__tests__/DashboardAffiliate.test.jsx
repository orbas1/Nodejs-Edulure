import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

import DashboardAffiliate from '../DashboardAffiliate.jsx';

const useOutletContextMock = vi.hoisted(() => vi.fn());
const useAuthMock = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useOutletContext: useOutletContextMock
  };
});

vi.mock('../../../context/AuthContext.jsx', () => ({
  useAuth: useAuthMock
}));

vi.mock('../../../api/learnerDashboardApi.js', () => ({
  createAffiliateChannel: vi.fn(),
  updateAffiliateChannel: vi.fn(),
  deleteAffiliateChannel: vi.fn(),
  recordAffiliatePayout: vi.fn()
}));

describe('<DashboardAffiliate />', () => {
  const affiliateSnapshot = {
    summary: {
      totalChannels: 2,
      activeChannels: 1,
      outstanding: '$380.00'
    },
    channels: [
      {
        id: '1',
        platform: 'Instagram',
        referralCode: 'IG-ACTIVE',
        status: 'active',
        commissionRateBps: 250,
        outstandingFormatted: '$500.00',
        metadata: { audienceFocus: 'Design leaders', contactEmail: 'ig@partners.test' },
        totalEarningsFormatted: '$1,200.00',
        totalPaidFormatted: '$720.00',
        nextPayout: { amount: '$180.00', scheduledAt: '2024-05-20T00:00:00.000Z' },
        notes: ['Hosts monthly launch webinar']
      },
      {
        id: '2',
        platform: 'YouTube',
        referralCode: 'YT-PAUSED',
        status: 'paused',
        commissionRateBps: 300,
        outstandingFormatted: '$320.00',
        metadata: {},
        totalEarningsFormatted: '$2,400.00',
        totalPaidFormatted: '$1,900.00',
        nextPayout: null,
        notes: []
      }
    ],
    payouts: [
      {
        id: 'payout-1',
        channelId: '1',
        amount: '$120.00',
        status: 'paid',
        scheduledAt: '2024-05-01T12:00:00.000Z'
      },
      {
        id: 'payout-2',
        channelId: '2',
        amount: '$80.00',
        status: 'scheduled',
        scheduledAt: '2024-05-05T12:00:00.000Z'
      }
    ]
  };

  let createObjectURLSpy;
  let revokeObjectURLSpy;

  beforeEach(() => {
    useOutletContextMock.mockReturnValue({
      role: 'instructor',
      dashboard: { affiliate: affiliateSnapshot },
      refresh: vi.fn()
    });
    useAuthMock.mockReturnValue({ session: { tokens: { accessToken: 'token-123' } } });
    createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:download');
    revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockReturnValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('filters channels by status and search before exporting the current view', async () => {
    const user = userEvent.setup();
    render(<DashboardAffiliate />);

    // Initial render shows both channels.
    expect(screen.getByText('IG-ACTIVE')).toBeInTheDocument();
    expect(screen.getByText('YT-PAUSED')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/channel status/i), 'active');

    expect(screen.getByText('IG-ACTIVE')).toBeInTheDocument();
    expect(screen.queryByText('YT-PAUSED')).toBeNull();

    await user.type(screen.getByLabelText(/search channels/i), 'ig');

    await user.click(screen.getByRole('button', { name: /export channels/i }));

    await waitFor(() => {
      expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
      expect(revokeObjectURLSpy).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/exported 1 channel/i)).toBeInTheDocument();
    });
  });

  it('narrows the payout roster by channel and status filters', async () => {
    const user = userEvent.setup();
    render(<DashboardAffiliate />);

    await user.selectOptions(screen.getByLabelText(/^channel$/i, { selector: 'select' }), '2');
    await user.selectOptions(screen.getByLabelText(/^status$/i, { selector: 'select' }), 'scheduled');

    expect(screen.getByText(/YouTube · YT-PAUSED/i)).toBeInTheDocument();
    expect(screen.queryByText(/Instagram · IG-ACTIVE/i)).toBeNull();

    await user.click(screen.getByRole('button', { name: /export payouts/i }));

    await waitFor(() => {
      expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/exported 1 payout/i)).toBeInTheDocument();
    });
  });
});
