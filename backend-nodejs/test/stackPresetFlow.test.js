import { describe, expect, it } from 'vitest';

import {
  applyPresetDefaults,
  parsePresetArgs
} from '../../scripts/lib/processSupervisor.mjs';
import { resolveRuntimeToggles } from '../src/servers/runtimeToggles.js';

describe('stack preset bootstrap flow', () => {
  it('applies lite defaults when no preset is provided', () => {
    const env = {};
    const result = applyPresetDefaults({ env, mutate: true });

    expect(result.preset).toBe('lite');
    expect(env.SERVICE_PRESET).toBe('lite');
    expect(env.RUNTIME_PRESET).toBe('lite');
    expect(env.SERVICE_TARGET).toBe('web');
    expect(env.SERVICE_JOB_GROUPS).toBe('core');
    expect(env.SERVICE_ENABLE_JOBS).toBe('false');
    expect(env.SERVICE_ENABLE_REALTIME).toBe('false');
    expect(env.SERVICE_ENABLE_SEARCH_REFRESH).toBe('false');
  });

  it('resolves CLI overrides for preset, targets, and job groups', () => {
    const parsed = parsePresetArgs(
      ['--preset', 'full', '--service-target', 'web,worker', '--job-groups', 'core, analytics'],
      { env: {} }
    );

    expect(parsed.preset).toBe('full');
    expect(parsed.overrides).toEqual({ serviceTarget: 'web,worker', jobGroups: 'core, analytics' });

    const env = { SERVICE_PRESET: 'lite' };
    const applied = applyPresetDefaults({
      preset: parsed.preset,
      env,
      mutate: true,
      overrides: parsed.overrides
    });

    expect(applied.preset).toBe('full');
    expect(env.SERVICE_PRESET).toBe('full');
    expect(env.RUNTIME_PRESET).toBe('full');
    expect(env.SERVICE_TARGET).toBe('web,worker');
    expect(env.SERVICE_JOB_GROUPS).toBe('core,analytics');
  });

  it('feeds runtime toggles with normalised boolean values', () => {
    const env = {};
    applyPresetDefaults({ preset: 'ads-analytics', env, mutate: true });

    const toggles = resolveRuntimeToggles(env);
    expect(toggles.preset).toBe('ads-analytics');
    expect(toggles.enableJobs).toBe(true);
    expect(toggles.enableRealtime).toBe(false);
    expect(toggles.enableSearchRefresh).toBe(true);
    expect(toggles.jobGroups).toBe('core,analytics');
  });

  it('tracks when pretty log output is explicitly requested', () => {
    const implicit = parsePresetArgs([], { env: {} });
    expect(implicit.prettyLogs).toBe(false);
    expect(implicit.prettyLogsExplicit).toBe(false);

    const envDriven = parsePresetArgs([], { env: { DEV_STACK_PRETTY_LOGS: 'true' } });
    expect(envDriven.prettyLogs).toBe(true);
    expect(envDriven.prettyLogsExplicit).toBe(true);

    const cliDriven = parsePresetArgs(['--pretty-logs'], { env: {} });
    expect(cliDriven.prettyLogs).toBe(true);
    expect(cliDriven.prettyLogsExplicit).toBe(true);

    const cliDisable = parsePresetArgs(['--ndjson-logs'], { env: { DEV_STACK_PRETTY_LOGS: 'true' } });
    expect(cliDisable.prettyLogs).toBe(false);
    expect(cliDisable.prettyLogsExplicit).toBe(true);
  });

  it('captures unknown arguments so callers can warn users', () => {
    const parsed = parsePresetArgs(['--preset', 'lite', '--unexpected', 'value']);
    expect(parsed.unknownArguments).toEqual(['--unexpected', 'value']);
  });
});
