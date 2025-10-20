import { render, screen, waitFor } from '@testing-library/react';
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
    useOutletContextMock.mockReturnValue({ role: 'admin', dashboard: {} });

    fetchAppearanceSettingsMock.mockResolvedValue({
      brand: {
        primaryColor: '#2563eb',
        secondaryColor: '#1e293b',
        accentColor: '#f97316'
      },
      layout: {
        homepageHeadline: 'Design the future of learning',
        homepageSubheadline: 'Deliver transformational learning.',
        callToActionLabel: 'Launch learner hub',
        callToActionUrl: '/explorer',
        announcement: 'Now serving enterprise academies.'
      },
      typography: {
        headingFont: 'Inter',
        bodyFont: 'General Sans',
        codeFont: 'Fira Code'
      },
      assets: []
    });

    fetchPreferenceSettingsMock.mockResolvedValue({
      localization: {
        defaultLanguage: 'en',
        supportedLanguages: ['en']
      },
      registrations: {},
      content: {},
      communications: {}
    });

    fetchSystemSettingsMock.mockResolvedValue({
      environment: {},
      security: {},
      storage: {},
      performance: {}
    });

    fetchIntegrationSettingsMock.mockResolvedValue({
      webhooks: [
        {
          id: 'enrollment-events',
          name: 'Enrollment stream',
          url: 'https://hooks.example.com/enrollments',
          events: ['learner.enrolled'],
          active: true
        }
      ],
      services: []
    });

    fetchThirdPartySettingsMock.mockResolvedValue({
      credentials: [
        {
          id: 'openai-prod',
          provider: 'openai',
          environment: 'production',
          alias: 'Instructional design copilot',
          ownerEmail: 'ai@edulure.com',
          status: 'active',
          notes: ''
        }
      ],
      monitoring: {
        enableHeartbeat: true,
        alertEmails: ['platform-operations@edulure.com']
      }
    });

    updateAppearanceSettingsMock.mockResolvedValue({});
    updatePreferenceSettingsMock.mockResolvedValue({});
    updateSystemSettingsMock.mockResolvedValue({});
    updateIntegrationSettingsMock.mockResolvedValue({});
    updateThirdPartySettingsMock.mockResolvedValue({});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('allows admins to update appearance call-to-action copy', async () => {
    const user = userEvent.setup({ delay: null });
    render(<DashboardSettings />);

    const headline = await screen.findByText(/visual identity & appearance/i);
    expect(headline).toBeInTheDocument();

    const callToActionField = screen.getByLabelText(/call-to-action label/i);
    await user.clear(callToActionField);
    await user.type(callToActionField, 'Launch now');

    const saveButton = screen.getByRole('button', { name: /save appearance/i });
    expect(saveButton).toBeEnabled();

    await user.click(saveButton);

    await waitFor(() => {
      expect(updateAppearanceSettingsMock).toHaveBeenCalledTimes(1);
      expect(updateAppearanceSettingsMock).toHaveBeenCalledWith({
        token: 'token-123',
        payload: expect.objectContaining({
          layout: expect.objectContaining({ callToActionLabel: 'Launch now' })
        })
      });
    });
  });

  it('renders integration and third-party empty states gracefully', async () => {
    fetchIntegrationSettingsMock.mockResolvedValueOnce({ webhooks: [], services: [] });
    fetchThirdPartySettingsMock.mockResolvedValueOnce(null);

    render(<DashboardSettings />);

    expect(await screen.findByText(/integration orchestration/i)).toBeInTheDocument();
    expect(await screen.findByText(/no webhooks configured yet/i)).toBeInTheDocument();

    expect(await screen.findByText(/third-party api governance/i)).toBeInTheDocument();
    expect(await screen.findByText(/no credentials provisioned yet/i)).toBeInTheDocument();
  });
});
