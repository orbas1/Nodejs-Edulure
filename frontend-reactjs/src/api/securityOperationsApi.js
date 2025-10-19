import { httpClient } from './httpClient.js';

function ensureToken(token) {
  if (!token) {
    throw new Error('Authentication token is required for security operations requests');
  }
}

export async function fetchRiskRegister({ token, params, signal } = {}) {
  ensureToken(token);

  const response = await httpClient.get('/security/risk-register', {
    token,
    params,
    signal,
    cache: { enabled: false }
  });

  return response?.data ?? response;
}

export async function createRiskRegisterEntry({ token, payload } = {}) {
  ensureToken(token);
  if (!payload || !payload.title || !payload.description) {
    throw new Error('Risk title and description are required to create a risk entry');
  }

  const response = await httpClient.post('/security/risk-register', payload, {
    token,
    cache: false,
    invalidateTags: ['security-risk-register']
  });

  return response?.data ?? response;
}

export async function updateRiskRegisterStatus({ token, riskId, payload } = {}) {
  ensureToken(token);
  if (!riskId) {
    throw new Error('Risk identifier is required to update risk status');
  }

  const response = await httpClient.patch(`/security/risk-register/${riskId}/status`, payload ?? {}, {
    token,
    cache: false,
    invalidateTags: ['security-risk-register']
  });

  return response?.data ?? response;
}

export async function recordRiskReview({ token, riskId, payload } = {}) {
  ensureToken(token);
  if (!riskId) {
    throw new Error('Risk identifier is required to record a review');
  }

  const response = await httpClient.post(`/security/risk-register/${riskId}/reviews`, payload ?? {}, {
    token,
    cache: false,
    invalidateTags: ['security-risk-register']
  });

  return response?.data ?? response;
}

export async function fetchContinuityExercises({ token, params, signal } = {}) {
  ensureToken(token);

  const response = await httpClient.get('/security/continuity/exercises', {
    token,
    params,
    signal,
    cache: { enabled: false }
  });

  return response?.data ?? response;
}

export async function logContinuityExercise({ token, payload } = {}) {
  ensureToken(token);
  if (!payload || !payload.scenarioKey || !payload.scenarioSummary) {
    throw new Error('Scenario key and summary are required to log continuity exercises');
  }

  const response = await httpClient.post('/security/continuity/exercises', payload, {
    token,
    cache: false,
    invalidateTags: ['security-continuity-exercises']
  });

  return response?.data ?? response;
}

export default {
  fetchRiskRegister,
  createRiskRegisterEntry,
  updateRiskRegisterStatus,
  recordRiskReview,
  fetchContinuityExercises,
  logContinuityExercise
};
