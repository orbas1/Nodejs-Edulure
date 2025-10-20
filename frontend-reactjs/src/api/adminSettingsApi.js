import { httpClient } from './httpClient.js';

function requireToken(token, action = 'perform this action') {
  if (!token) {
    throw new Error(`Authentication token is required to ${action}`);
  }
}

function normaliseAdminProfileSettings(payload = {}) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  return {
    organisation: payload.organisation ?? {},
    leadership: Array.isArray(payload.leadership) ? payload.leadership : [],
    supportChannels: Array.isArray(payload.supportChannels) ? payload.supportChannels : [],
    runbooks: Array.isArray(payload.runbooks) ? payload.runbooks : [],
    media: Array.isArray(payload.media) ? payload.media : [],
    onCall: payload.onCall ?? {}
  };
}

function normalisePaymentSettings(payload = {}) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  return {
    processors: Array.isArray(payload.processors) ? payload.processors : [],
    payoutRules: payload.payoutRules ?? {},
    bankAccounts: Array.isArray(payload.bankAccounts) ? payload.bankAccounts : [],
    webhooks: Array.isArray(payload.webhooks) ? payload.webhooks : []
  };
}

function normaliseEmailSettings(payload = {}) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  return {
    branding: payload.branding ?? {},
    notifications: payload.notifications ?? {},
    escalationRecipients: Array.isArray(payload.escalationRecipients)
      ? payload.escalationRecipients
      : payload.escalationRecipients
        ? String(payload.escalationRecipients).split(',').map((entry) => entry.trim()).filter(Boolean)
        : [],
    domains: Array.isArray(payload.domains) ? payload.domains : [],
    templates: Array.isArray(payload.templates) ? payload.templates : []
  };
}

function normaliseSecuritySettings(payload = {}) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  return {
    enforcement: payload.enforcement ?? {},
    methods: Array.isArray(payload.methods) ? payload.methods : [],
    backup: payload.backup ?? {},
    audits: Array.isArray(payload.audits) ? payload.audits : []
  };
}

function normaliseFinanceSettings(payload = {}) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  return {
    policies: payload.policies ?? {},
    tiers: Array.isArray(payload.tiers) ? payload.tiers : [],
    adjustments: Array.isArray(payload.adjustments) ? payload.adjustments : [],
    revenueStreams: Array.isArray(payload.revenueStreams) ? payload.revenueStreams : [],
    approvals: payload.approvals ?? {}
  };
}

export async function fetchAdminProfileSettings({ token, signal } = {}) {
  requireToken(token, 'load admin profile settings');
  const response = await httpClient.get('/admin/settings/profile', {
    token,
    signal,
    cache: { enabled: false }
  });
  return normaliseAdminProfileSettings(response?.data ?? response);
}

export async function updateAdminProfileSettings({ token, payload } = {}) {
  requireToken(token, 'update admin profile settings');
  const response = await httpClient.put('/admin/settings/profile', payload, { token, cache: false });
  return normaliseAdminProfileSettings(response?.data ?? response);
}

export async function fetchPaymentSettings({ token, signal } = {}) {
  requireToken(token, 'load payment settings');
  const response = await httpClient.get('/admin/settings/payments', {
    token,
    signal,
    cache: { enabled: false }
  });
  return normalisePaymentSettings(response?.data ?? response);
}

export async function updatePaymentSettings({ token, payload } = {}) {
  requireToken(token, 'update payment settings');
  const response = await httpClient.put('/admin/settings/payments', payload, { token, cache: false });
  return normalisePaymentSettings(response?.data ?? response);
}

export async function fetchEmailSettings({ token, signal } = {}) {
  requireToken(token, 'load email settings');
  const response = await httpClient.get('/admin/settings/emails', {
    token,
    signal,
    cache: { enabled: false }
  });
  return normaliseEmailSettings(response?.data ?? response);
}

export async function updateEmailSettings({ token, payload } = {}) {
  requireToken(token, 'update email settings');
  const response = await httpClient.put('/admin/settings/emails', payload, { token, cache: false });
  return normaliseEmailSettings(response?.data ?? response);
}

export async function fetchSecuritySettings({ token, signal } = {}) {
  requireToken(token, 'load security settings');
  const response = await httpClient.get('/admin/settings/security', {
    token,
    signal,
    cache: { enabled: false }
  });
  return normaliseSecuritySettings(response?.data ?? response);
}

export async function updateSecuritySettings({ token, payload } = {}) {
  requireToken(token, 'update security settings');
  const response = await httpClient.put('/admin/settings/security', payload, { token, cache: false });
  return normaliseSecuritySettings(response?.data ?? response);
}

export async function fetchFinanceSettings({ token, signal } = {}) {
  requireToken(token, 'load finance settings');
  const response = await httpClient.get('/admin/settings/finance', {
    token,
    signal,
    cache: { enabled: false }
  });
  return normaliseFinanceSettings(response?.data ?? response);
}

export async function updateFinanceSettings({ token, payload } = {}) {
  requireToken(token, 'update finance settings');
  const response = await httpClient.put('/admin/settings/finance', payload, { token, cache: false });
  return normaliseFinanceSettings(response?.data ?? response);
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
  fetchAdminProfileSettings,
  updateAdminProfileSettings,
  fetchPaymentSettings,
  updatePaymentSettings,
  fetchEmailSettings,
  updateEmailSettings,
  fetchSecuritySettings,
  updateSecuritySettings,
  fetchFinanceSettings,
  updateFinanceSettings,
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
