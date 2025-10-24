import { env } from '../config/env.js';

const DEFAULT_CREDENTIAL_POLICY = {
  minRotationDays: 30,
  maxRotationDays: 365,
  defaultRotationDays: 90
};

const PROVIDERS = {
  hubspot: {
    id: 'hubspot',
    label: 'HubSpot CRM',
    category: 'crm',
    type: 'marketing_automation',
    credentialPolicy: { ...DEFAULT_CREDENTIAL_POLICY },
    surfaces: { orchestrator: true, dashboard: true }
  },
  salesforce: {
    id: 'salesforce',
    label: 'Salesforce CRM',
    category: 'crm',
    type: 'sales_automation',
    credentialPolicy: { ...DEFAULT_CREDENTIAL_POLICY },
    surfaces: { orchestrator: true, dashboard: true }
  },
  openai: {
    id: 'openai',
    label: 'OpenAI',
    category: 'ai',
    type: 'text_generation',
    credentialPolicy: { ...DEFAULT_CREDENTIAL_POLICY, defaultRotationDays: 90 },
    surfaces: { invites: true }
  },
  anthropic: {
    id: 'anthropic',
    label: 'Anthropic Claude',
    category: 'ai',
    type: 'text_generation',
    credentialPolicy: { ...DEFAULT_CREDENTIAL_POLICY, defaultRotationDays: 90 },
    surfaces: { invites: true }
  },
  grok: {
    id: 'grok',
    label: 'XAI Grok',
    category: 'ai',
    type: 'text_generation',
    credentialPolicy: { ...DEFAULT_CREDENTIAL_POLICY, defaultRotationDays: 60 },
    surfaces: { invites: true }
  },
  'azure-openai': {
    id: 'azure-openai',
    label: 'Azure OpenAI',
    category: 'ai',
    type: 'text_generation',
    credentialPolicy: { ...DEFAULT_CREDENTIAL_POLICY, defaultRotationDays: 60 },
    surfaces: { invites: true }
  },
  'google-vertex': {
    id: 'google-vertex',
    label: 'Google Vertex AI',
    category: 'ai',
    type: 'ml_platform',
    credentialPolicy: { ...DEFAULT_CREDENTIAL_POLICY, defaultRotationDays: 60 },
    surfaces: { invites: true }
  }
};

function normaliseProviderId(value) {
  if (!value) {
    return null;
  }

  const key = String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-');

  return PROVIDERS[key]?.id ?? null;
}

function getProviderDefinition(value) {
  const id = normaliseProviderId(value);
  if (!id) {
    return null;
  }
  return PROVIDERS[id];
}

function getCredentialPolicy(value) {
  const provider = getProviderDefinition(value);
  if (!provider) {
    return DEFAULT_CREDENTIAL_POLICY;
  }

  return {
    minRotationDays: provider.credentialPolicy?.minRotationDays ?? DEFAULT_CREDENTIAL_POLICY.minRotationDays,
    maxRotationDays: provider.credentialPolicy?.maxRotationDays ?? DEFAULT_CREDENTIAL_POLICY.maxRotationDays,
    defaultRotationDays: provider.credentialPolicy?.defaultRotationDays ?? DEFAULT_CREDENTIAL_POLICY.defaultRotationDays
  };
}

function listProviders({ surface } = {}) {
  const entries = Object.values(PROVIDERS);

  if (!surface) {
    return entries;
  }

  return entries.filter((provider) => provider.surfaces?.[surface]);
}

function getIntegrationDescriptor(value) {
  const provider = getProviderDefinition(value);
  if (!provider) {
    return null;
  }

  return {
    id: provider.id,
    label: provider.label,
    category: provider.category ?? 'integration',
    type: provider.type ?? 'general',
    enabled: resolveProviderEnablement(provider.id)
  };
}

function resolveProviderEnablement(providerId) {
  const config = env.integrations ?? {};
  if (providerId === 'hubspot') {
    return Boolean(config.hubspot?.enabled);
  }
  if (providerId === 'salesforce') {
    return Boolean(config.salesforce?.enabled);
  }
  return true;
}

export {
  DEFAULT_CREDENTIAL_POLICY,
  PROVIDERS,
  getCredentialPolicy,
  getIntegrationDescriptor,
  getProviderDefinition,
  listProviders,
  normaliseProviderId
};

export default {
  DEFAULT_CREDENTIAL_POLICY,
  PROVIDERS,
  listProviders,
  getProviderDefinition,
  getCredentialPolicy,
  normaliseProviderId,
  getIntegrationDescriptor
};
