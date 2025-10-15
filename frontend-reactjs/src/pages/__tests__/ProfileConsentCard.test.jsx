import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Profile from '../Profile.jsx';

const revokeConsentMock = vi.hoisted(() => vi.fn());
const useConsentRecordsMock = vi.hoisted(() => vi.fn());

vi.mock('../../context/AuthContext.jsx', () => ({
  useAuth: () => ({ session: { user: { id: 55 } } })
}));

vi.mock('../../hooks/useConsentRecords.js', () => ({
  __esModule: true,
  default: useConsentRecordsMock
}));

describe('<Profile /> consent ledger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useConsentRecordsMock.mockReturnValue({
      consents: [
        {
          id: 10,
          consentType: 'Marketing communications',
          policyVersion: '2025-02',
          channel: 'web',
          grantedAt: '2025-02-02T08:00:00.000Z',
          status: 'granted',
          active: true
        }
      ],
      loading: false,
      error: null,
      revokeConsent: revokeConsentMock
    });
  });

  it('renders live consent records and allows revocation', async () => {
    render(<Profile />);

    expect(screen.getByText('Privacy & consent ledger')).toBeInTheDocument();
    expect(screen.getByText('Marketing communications')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Revoke' })).toBeEnabled();

    await userEvent.click(screen.getByRole('button', { name: 'Revoke' }));

    expect(revokeConsentMock).toHaveBeenCalledWith({ consentId: 10, reason: 'Revoked from profile dashboard' });
  });

  it('communicates loading state while consent data is fetched', () => {
    useConsentRecordsMock.mockReturnValueOnce({
      consents: [],
      loading: true,
      error: null,
      revokeConsent: revokeConsentMock
    });

    render(<Profile />);

    expect(screen.getByText('Loading consent history…')).toBeInTheDocument();
  });
});
