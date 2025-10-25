import { describe, expect, it } from 'vitest';

import {
  buildOnboardingDraftPayload,
  calculateOnboardingCompletion,
  createOnboardingState,
  validateOnboardingState
} from '../onboarding.js';
import { DEFAULT_PASSWORD_POLICY } from '../auth.js';

describe('onboarding validation helpers', () => {
  it('builds learner onboarding drafts with trimmed fields and ISO date of birth', () => {
    const state = {
      ...createOnboardingState('learner'),
      firstName: ' Jordan ',
      lastName: '  Ops  ',
      email: 'operator@example.com ',
      dateOfBirth: '1995-03-12',
      termsAccepted: true
    };

    const draft = buildOnboardingDraftPayload('learner', state, { passwordPolicy: DEFAULT_PASSWORD_POLICY });

    expect(draft).toMatchObject({
      email: 'operator@example.com',
      firstName: 'Jordan',
      lastName: 'Ops',
      dateOfBirth: '1995-03-12T00:00:00.000Z',
      termsAccepted: true
    });
  });

  it('calculates learner onboarding completion based on essential checkpoints', () => {
    const state = {
      ...createOnboardingState('learner'),
      firstName: 'Jordan',
      email: 'jordan@example.com',
      password: 'SecurePass!234',
      confirmPassword: 'SecurePass!234',
      termsAccepted: true
    };

    const progress = calculateOnboardingCompletion('learner', state, { passwordPolicy: DEFAULT_PASSWORD_POLICY });

    expect(progress.completed).toBe(5);
    expect(progress.total).toBe(5);
    expect(progress.progress).toBe(1);
  });

  it('validates learner onboarding state and reports missing requirements', () => {
    const state = {
      ...createOnboardingState('learner'),
      firstName: 'Jordan',
      email: 'jordan@example.com',
      password: 'short',
      confirmPassword: 'different',
      role: 'guest',
      termsAccepted: false,
      dateOfBirth: '2050-01-01'
    };

    const validation = validateOnboardingState('learner', state, { passwordPolicy: DEFAULT_PASSWORD_POLICY });

    expect(validation.isValid).toBe(false);
    expect(validation.errors).toMatchObject({
      password: expect.any(String),
      confirmPassword: expect.any(String),
      role: expect.any(String),
      termsAccepted: expect.any(String),
      dateOfBirth: expect.any(String)
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
