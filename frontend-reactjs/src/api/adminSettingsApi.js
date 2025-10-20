import { httpClient } from './httpClient.js';

function requireToken(token, action = 'perform this action') {
  if (!token) {
    throw new Error(`Authentication token is required to ${action}`);
  }
}

export async function fetchAppearanceSettings({ token, signal } = {}) {
  requireToken(token, 'load appearance settings');
  const response = await httpClient.get('/admin/settings/appearance', {
    token,
    signal,
    cache: { enabled: false }
  });
  return response?.data ?? response;
}

export async function updateAppearanceSettings({ token, payload } = {}) {
  requireToken(token, 'update appearance settings');
  const response = await httpClient.put('/admin/settings/appearance', payload, {
    token,
    cache: false
  });
  return response?.data ?? response;
}

export async function fetchPreferenceSettings({ token, signal } = {}) {
  requireToken(token, 'load preference settings');
  const response = await httpClient.get('/admin/settings/preferences', {
    token,
    signal,
    cache: { enabled: false }
  });
  return response?.data ?? response;
}

export async function updatePreferenceSettings({ token, payload } = {}) {
  requireToken(token, 'update preference settings');
  const response = await httpClient.put('/admin/settings/preferences', payload, {
    token,
    cache: false
  });
  return response?.data ?? response;
}

export async function fetchSystemSettings({ token, signal } = {}) {
  requireToken(token, 'load system settings');
  const response = await httpClient.get('/admin/settings/system', {
    token,
    signal,
    cache: { enabled: false }
  });
  return response?.data ?? response;
}

export async function updateSystemSettings({ token, payload } = {}) {
  requireToken(token, 'update system settings');
  const response = await httpClient.put('/admin/settings/system', payload, {
    token,
    cache: false
  });
  return response?.data ?? response;
}

export async function fetchIntegrationSettings({ token, signal } = {}) {
  requireToken(token, 'load integration settings');
  const response = await httpClient.get('/admin/settings/integrations', {
    token,
    signal,
    cache: { enabled: false }
  });
  return response?.data ?? response;
}

export async function updateIntegrationSettings({ token, payload } = {}) {
  requireToken(token, 'update integration settings');
  const response = await httpClient.put('/admin/settings/integrations', payload, {
    token,
    cache: false
  });
  return response?.data ?? response;
}

export async function fetchThirdPartySettings({ token, signal } = {}) {
  requireToken(token, 'load third-party API settings');
  const response = await httpClient.get('/admin/settings/third-party', {
    token,
    signal,
    cache: { enabled: false }
  });
  return response?.data ?? response;
}

export async function updateThirdPartySettings({ token, payload } = {}) {
  requireToken(token, 'update third-party API settings');
  const response = await httpClient.put('/admin/settings/third-party', payload, {
    token,
    cache: false
  });
  return response?.data ?? response;
}

export const adminSettingsApi = {
  fetchAppearanceSettings,
  updateAppearanceSettings,
  fetchPreferenceSettings,
  updatePreferenceSettings,
  fetchSystemSettings,
  updateSystemSettings,
  fetchIntegrationSettings,
  updateIntegrationSettings,
  fetchThirdPartySettings,
  updateThirdPartySettings
};

export default adminSettingsApi;
