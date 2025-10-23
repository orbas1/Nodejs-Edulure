import { describe, expect, it } from 'vitest';

import {
  buildOnboardingDraftPayload,
  calculateOnboardingCompletion,
  createOnboardingState,
  validateOnboardingState
} from '../onboarding.js';
import { DEFAULT_PASSWORD_POLICY } from '../auth.js';

describe('onboarding validation helpers', () => {
  it('builds onboarding drafts with normalised metadata and deduplicated invites', () => {
    const state = {
      ...createOnboardingState('learner'),
      firstName: ' Jordan ',
      lastName: '  Ops  ',
      email: 'operator@example.com ',
      persona: 'Community Operator',
      goalsInput: 'Launch Flow 5, Grow revenue, launch flow 5',
      inviteCodes: 'FLOW5-OPS, flow5-ops, ',
      marketingSource: '  Conference ',
      marketingCampaign: ' Flow5 Beta ',
      marketingOptIn: true,
      interestsInput: 'Analytics, analytics, community',
      timeCommitment: ' 5h/week ',
      onboardingPath: 'Community-first',
      termsAccepted: true
    };

    const draft = buildOnboardingDraftPayload('learner', state, { passwordPolicy: DEFAULT_PASSWORD_POLICY });

    expect(draft).toMatchObject({
      email: 'operator@example.com',
      firstName: 'Jordan',
      persona: 'Community Operator',
      metadata: { source: 'Conference', campaign: 'Flow5 Beta' },
      preferences: expect.objectContaining({ marketingOptIn: true })
    });
    expect(draft.invites).toEqual([{ code: 'FLOW5-OPS' }]);
  });

  it('calculates onboarding completion checkpoints based on provided data', () => {
    const state = {
      ...createOnboardingState('learner'),
      firstName: 'Jordan',
      email: 'jordan@example.com',
      persona: 'Ops',
      goalsInput: 'Launch Flow 5',
      interestsInput: 'Analytics',
      password: 'SecurePass!234',
      confirmPassword: 'SecurePass!234',
      termsAccepted: true
    };

    const progress = calculateOnboardingCompletion('learner', state, { passwordPolicy: DEFAULT_PASSWORD_POLICY });

    expect(progress.completed).toBeGreaterThanOrEqual(6);
    expect(progress.total).toBe(8);
    expect(progress.progress).toBeGreaterThan(0.6);
  });

  it('validates learner onboarding state and reports missing requirements', () => {
    const state = {
      ...createOnboardingState('learner'),
      firstName: 'Jordan',
      email: 'jordan@example.com',
      password: 'short',
      confirmPassword: 'different',
      role: 'guest',
      termsAccepted: false
    };

    const validation = validateOnboardingState('learner', state, { passwordPolicy: DEFAULT_PASSWORD_POLICY });

    expect(validation.isValid).toBe(false);
    expect(validation.errors).toMatchObject({
      password: expect.any(String),
      confirmPassword: expect.any(String),
      role: expect.any(String),
      termsAccepted: expect.any(String)
    });
  });

  it('validates instructor onboarding state without requiring password checks', () => {
    const state = {
      ...createOnboardingState('instructor'),
      firstName: 'River',
      email: 'river@example.com',
      persona: 'Instructor',
      goalsInput: 'Launch Flow 5 cohort',
      termsAccepted: true
    };

    const validation = validateOnboardingState('instructor', state);

    expect(validation.isValid).toBe(true);
    expect(validation.bootstrapPayload).toMatchObject({
      email: 'river@example.com',
      role: 'instructor'
    });
  });
});
