import { httpClient } from './httpClient.js';

function requireToken(token, action = 'perform this action') {
  if (!token) {
    throw new Error(`Authentication token is required to ${action}`);
  }
}

function ensureArray(value) {
  return Array.isArray(value) ? value : value ? [value] : [];
}

function normaliseRun(run) {
  if (!run || typeof run !== 'object') {
    return null;
  }

  return {
    publicId: run.publicId ?? run.public_id ?? null,
    versionTag: run.versionTag ?? run.version_tag ?? null,
    environment: run.environment ?? null,
    status: run.status ?? 'scheduled',
    readinessScore: run.readinessScore ?? run.metadata?.readinessScore ?? null,
    changeWindowStart: run.changeWindowStart ?? run.change_window_start ?? null,
    changeWindowEnd: run.changeWindowEnd ?? run.change_window_end ?? null,
    scheduledAt: run.scheduledAt ?? run.scheduled_at ?? null
  };
}

function normaliseDashboard(payload = {}) {
  const upcoming = ensureArray(payload.upcoming).map(normaliseRun).filter(Boolean);
  const recent = ensureArray(payload.recent).map(normaliseRun).filter(Boolean);
  const breakdown = payload.breakdown && typeof payload.breakdown === 'object' ? payload.breakdown : {};
  const requiredGates = ensureArray(payload.requiredGates ?? payload.required_gates);

  return {
    upcoming,
    recent,
    breakdown,
    requiredGates
  };
}

export async function fetchReleaseDashboard({ token, params, signal } = {}) {
  requireToken(token, 'load release dashboard data');
  const response = await httpClient.get('/release/dashboard', {
    token,
    params,
    signal,
    cache: { enabled: false }
  });
  return normaliseDashboard(response?.data ?? response ?? {});
}
