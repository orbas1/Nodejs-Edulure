import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import useConsentRecords from '../useConsentRecords.js';

const fetchUserConsentsMock = vi.hoisted(() => vi.fn());
const revokeConsentMock = vi.hoisted(() => vi.fn());
const useAuthMock = vi.hoisted(() => vi.fn());

vi.mock('../../api/complianceApi.js', () => ({
  fetchUserConsents: fetchUserConsentsMock,
  revokeConsent: revokeConsentMock
}));

vi.mock('../../context/AuthContext.jsx', () => ({
  useAuth: useAuthMock
}));

describe('useConsentRecords', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthMock.mockReturnValue({ session: { tokens: { accessToken: 'token-abc' } } });
    fetchUserConsentsMock.mockResolvedValue([
      { id: 1, status: 'granted', policyVersion: '2025-02' }
    ]);
    revokeConsentMock.mockResolvedValue({});
  });

  it('loads consent data on mount when token and userId exist', async () => {
    const { result } = renderHook(() => useConsentRecords(42));

    await waitFor(() => {
      expect(fetchUserConsentsMock).toHaveBeenCalledWith({ token: 'token-abc', userId: 42 });
    });

    expect(result.current.consents).toEqual([
      { id: 1, status: 'granted', policyVersion: '2025-02' }
    ]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('skips loading when token is missing', async () => {
    useAuthMock.mockReturnValueOnce({ session: null });

    renderHook(() => useConsentRecords(42));

    await act(async () => {
      await Promise.resolve();
    });

    expect(fetchUserConsentsMock).not.toHaveBeenCalled();
  });

  it('re-fetches consent data after revocation', async () => {
    const { result } = renderHook(() => useConsentRecords(42));

    await waitFor(() => {
      expect(fetchUserConsentsMock).toHaveBeenCalledTimes(1);
    });

    fetchUserConsentsMock.mockResolvedValueOnce([
      { id: 1, status: 'revoked', policyVersion: '2025-02' }
    ]);

    await act(async () => {
      await result.current.revokeConsent({ consentId: 1, reason: 'user request' });
    });

    expect(revokeConsentMock).toHaveBeenCalledWith({ token: 'token-abc', consentId: 1, reason: 'user request' });
    expect(fetchUserConsentsMock).toHaveBeenCalledTimes(2);
    expect(result.current.consents).toEqual([
      { id: 1, status: 'revoked', policyVersion: '2025-02' }
    ]);
  });
});
