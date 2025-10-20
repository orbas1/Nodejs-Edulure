import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import DashboardSettings from '../DashboardSettings.jsx';

const useOutletContextMock = vi.hoisted(() => vi.fn());
const fetchAppearanceSettingsMock = vi.hoisted(() => vi.fn());
const fetchPreferenceSettingsMock = vi.hoisted(() => vi.fn());
const fetchSystemSettingsMock = vi.hoisted(() => vi.fn());
const fetchIntegrationSettingsMock = vi.hoisted(() => vi.fn());
const fetchThirdPartySettingsMock = vi.hoisted(() => vi.fn());
const updateAppearanceSettingsMock = vi.hoisted(() => vi.fn());
const updatePreferenceSettingsMock = vi.hoisted(() => vi.fn());
const updateSystemSettingsMock = vi.hoisted(() => vi.fn());
const updateIntegrationSettingsMock = vi.hoisted(() => vi.fn());
const updateThirdPartySettingsMock = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useOutletContext: useOutletContextMock
  };
});

vi.mock('../../../context/AuthContext.jsx', () => ({
  useAuth: () => ({
    session: {
      tokens: { accessToken: 'token-123' }
    }
  })
}));

vi.mock('../../../api/adminSettingsApi.js', () => ({
  fetchAppearanceSettings: fetchAppearanceSettingsMock,
  fetchPreferenceSettings: fetchPreferenceSettingsMock,
  fetchSystemSettings: fetchSystemSettingsMock,
  fetchIntegrationSettings: fetchIntegrationSettingsMock,
  fetchThirdPartySettings: fetchThirdPartySettingsMock,
  updateAppearanceSettings: updateAppearanceSettingsMock,
  updatePreferenceSettings: updatePreferenceSettingsMock,
  updateSystemSettings: updateSystemSettingsMock,
  updateIntegrationSettings: updateIntegrationSettingsMock,
  updateThirdPartySettings: updateThirdPartySettingsMock
}));

describe('<DashboardSettings /> admin experience', () => {
  beforeEach(() => {
    useOutletContextMock.mockReturnValue({ role: 'admin' });

    fetchAppearanceSettingsMock.mockResolvedValue({
      branding: {
        primaryColor: '#2563EB',
        secondaryColor: '#9333EA',
        accentColor: '#F59E0B',
        logoUrl: 'https://cdn.example.com/logo.svg',
        faviconUrl: ''
      },
      theme: {
        mode: 'light',
        borderRadius: 'rounded',
        density: 'comfortable',
        fontFamily: 'Inter',
        headingFontFamily: 'Cal Sans'
      },
      hero: {
        heading: 'Inspire learners at scale',
        subheading: 'Craft immersive cohort experiences.',
        primaryCtaLabel: 'Explore programs',
        primaryCtaUrl: '/explore'
      },
      mediaLibrary: []
    });

    fetchPreferenceSettingsMock.mockResolvedValue({
      localisation: {
        defaultLanguage: 'en',
        supportedLanguages: ['en'],
        currency: 'USD',
        timezone: 'UTC'
      },
      experience: {
        enableRecommendations: true,
        enableSocialSharing: true,
        enableLiveChatSupport: false,
        allowGuestCheckout: false,
        requireEmailVerification: true
      },
      communications: {
        supportEmail: 'support@edulure.io',
        supportPhone: '',
        marketingEmail: '',
        sendWeeklyDigest: true,
        sendProductUpdates: true
      }
    });

    fetchSystemSettingsMock.mockResolvedValue({
      maintenanceMode: { enabled: false, message: '', scheduledWindow: null },
      operations: { timezone: 'UTC', weeklyBackupDay: 'sunday', autoUpdatesEnabled: true, dataRetentionDays: 365 },
      security: { enforceMfaForAdmins: true, sessionTimeoutMinutes: 60, allowSessionResume: true },
      observability: { enableAuditTrail: true, errorReportingEmail: '', notifyOnIntegrationFailure: true }
    });

    fetchIntegrationSettingsMock.mockResolvedValue({ webhooks: [], services: [] });
    fetchThirdPartySettingsMock.mockResolvedValue({ credentials: [] });

    updateAppearanceSettingsMock.mockResolvedValue({});
    updatePreferenceSettingsMock.mockResolvedValue({});
    updateSystemSettingsMock.mockResolvedValue({});
    updateIntegrationSettingsMock.mockResolvedValue({});
    updateThirdPartySettingsMock.mockResolvedValue({});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('allows admins to update primary branding colour', async () => {
    const user = userEvent.setup();
    render(<DashboardSettings />);

    const appearanceHeading = await screen.findByRole('heading', { name: /website appearance/i });
    const appearanceSection = appearanceHeading.closest('section');
    expect(appearanceSection).toBeInTheDocument();

    const colourField = within(appearanceSection).getByLabelText(/primary colour/i);
    await user.clear(colourField);
    await user.type(colourField, '#111111');

    const saveButton = within(appearanceSection).getByRole('button', { name: /save changes/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(updateAppearanceSettingsMock).toHaveBeenCalledWith({
        token: 'token-123',
        payload: expect.objectContaining({
          branding: expect.objectContaining({ primaryColor: '#111111' })
        })
      });
    });
  });

  it('renders integration and credential empty states', async () => {
    render(<DashboardSettings />);

    const integrationsHeading = await screen.findByRole('heading', { name: /integration settings/i });
    expect(within(integrationsHeading.closest('section')).getByText(/no webhook subscriptions configured yet/i)).toBeInTheDocument();

    const credentialsHeading = await screen.findByRole('heading', { name: /third-party api credentials/i });
    expect(within(credentialsHeading.closest('section')).getByText(/no credentials captured yet/i)).toBeInTheDocument();
  });

  it('adds a new credential card when requested', async () => {
    const user = userEvent.setup();
    render(<DashboardSettings />);

    const credentialSection = await screen.findByRole('heading', { name: /third-party api credentials/i });
    const section = credentialSection.closest('section');

    const addButton = within(section).getByRole('button', { name: /add credential/i });
    await user.click(addButton);

    expect(within(section).getByLabelText(/provider/i)).toBeInTheDocument();
  });
});
