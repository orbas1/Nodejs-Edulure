import { render, waitFor } from '@testing-library/react';
import PropTypes from 'prop-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SystemPreferencesProvider, useSystemPreferences } from '../SystemPreferencesContext.jsx';

const useAuthMock = vi.hoisted(() => vi.fn());
const fetchSystemPreferencesMock = vi.hoisted(() => vi.fn());

vi.mock('../AuthContext.jsx', () => ({
  useAuth: useAuthMock
}));

vi.mock('../../api/learnerDashboardApi.js', () => ({
  fetchSystemPreferences: fetchSystemPreferencesMock
}));

function TestConsumer({ onRender }) {
  const context = useSystemPreferences();
  onRender?.(context);
  return null;
}

TestConsumer.propTypes = {
  onRender: PropTypes.func
};

describe('SystemPreferencesProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthMock.mockReturnValue({
      session: { tokens: { accessToken: 'token-abc' } },
      isAuthenticated: true
    });
    fetchSystemPreferencesMock.mockResolvedValue({
      data: {
        language: 'en',
        region: 'US',
        timezone: 'UTC',
        notificationsEnabled: true,
        digestEnabled: true,
        autoPlayMedia: false,
        highContrast: true,
        reducedMotion: true,
        preferences: {
          interfaceDensity: 'compact',
          analyticsOptIn: true,
          subtitleLanguage: 'en',
          audioDescription: true
        }
      }
    });
  });

  it('applies document attributes when preferences resolve', async () => {
    const renderSpy = vi.fn();

    render(
      <SystemPreferencesProvider>
        <TestConsumer onRender={renderSpy} />
      </SystemPreferencesProvider>
    );

    await waitFor(() => {
      expect(fetchSystemPreferencesMock).toHaveBeenCalledWith({ token: 'token-abc' });
      expect(renderSpy).toHaveBeenCalled();
    });

    const latestContext = renderSpy.mock.calls.at(-1)?.[0];
    expect(latestContext?.preferences?.highContrast).toBe(true);
    expect(latestContext?.preferences?.reducedMotion).toBe(true);
    expect(document.body.getAttribute('data-contrast')).toBe('high');
    expect(document.body.getAttribute('data-motion')).toBe('reduce');
    expect(document.body.getAttribute('data-density')).toBe('compact');
  });

  it('clears document attributes when the session ends', async () => {
    const renderSpy = vi.fn();

    const { rerender } = render(
      <SystemPreferencesProvider>
        <TestConsumer onRender={renderSpy} />
      </SystemPreferencesProvider>
    );

    await waitFor(() => expect(document.body.getAttribute('data-motion')).toBe('reduce'));

    useAuthMock.mockReturnValue({ session: null, isAuthenticated: false });
    fetchSystemPreferencesMock.mockClear();

    rerender(
      <SystemPreferencesProvider>
        <TestConsumer onRender={renderSpy} />
      </SystemPreferencesProvider>
    );

    await waitFor(() => {
      expect(document.body.getAttribute('data-motion')).toBeNull();
      expect(document.body.getAttribute('data-contrast')).toBeNull();
      expect(document.body.getAttribute('data-density')).toBeNull();
    });
    expect(fetchSystemPreferencesMock).not.toHaveBeenCalled();
  });
});
