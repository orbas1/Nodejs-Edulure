import { describe, expect, it } from 'vitest';

import {
  normalizeJobGroupInput,
  resolveJobGroupActivation
} from '../../scripts/lib/processSupervisor.mjs';

describe('job group activation helpers', () => {
  it('defaults to the core job group when none are provided', () => {
    const activation = resolveJobGroupActivation(undefined, {});
    expect(activation.requested).toEqual(['core']);
    expect(activation.active).toEqual(['core']);
    expect(activation.disabled).toEqual([]);
  });

  it('normalises explicit job group input to canonical keys', () => {
    expect(normalizeJobGroupInput(['Telemetry', ' monetization ', 'ads', 'ads'])).toEqual([
      'telemetry',
      'monetisation',
      'ads'
    ]);
  });

  it('canonicalises synonyms and disables groups when feature flags are off', () => {
    const activation = resolveJobGroupActivation('telemetry, Monetization,ads,unknown', {
      telemetry: false,
      monetisation: false,
      ads: true
    });

    expect(activation.requested).toEqual(['telemetry', 'monetisation', 'ads', 'core']);
    expect(activation.active).toEqual(['ads', 'core']);
    expect(activation.disabled).toEqual(['telemetry', 'monetisation']);
    expect(activation.unknown).toEqual(['unknown']);
  });

  it('activates optional groups when the corresponding feature flag is enabled', () => {
    const activation = resolveJobGroupActivation(['telemetry', 'analytics'], {
      telemetry: true,
      analytics: true
    });

    expect(activation.active).toEqual(['telemetry', 'analytics', 'core']);
    expect(activation.disabled).toEqual([]);
  });
});
