import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('dotenv', () => ({
  __esModule: true,
  default: { config: vi.fn() }
}));

const destroyMock = vi.fn().mockResolvedValue();
const migrateMock = vi.fn().mockResolvedValue();

vi.mock('../../src/config/database.js', () => ({
  __esModule: true,
  default: { destroy: destroyMock, migrate: { latest: migrateMock } }
}));

const defaultLoggerStub = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  child: vi.fn(function child() {
    return defaultLoggerStub;
  })
};

vi.mock('../../src/config/logger.js', () => ({
  __esModule: true,
  default: defaultLoggerStub
}));

vi.mock('../../src/config/env.js', () => ({
  __esModule: true,
  env: {
    nodeEnv: 'test',
    logging: { redactedFields: [], level: 'info', serviceName: 'test-service' },
    isDevelopment: false,
    runtimeConfig: {
      featureFlagCacheTtlMs: 0,
      featureFlagRefreshIntervalMs: 0,
      configCacheTtlMs: 0,
      configRefreshIntervalMs: 0
    },
    database: { name: 'test' },
    dataGovernance: { schemaGuard: {} }
  }
}));

const featureFlagServiceStub = {
  start: vi.fn(),
  stop: vi.fn(),
  evaluateAll: vi.fn()
};

const runtimeConfigServiceStub = {
  start: vi.fn(),
  stop: vi.fn(),
  listForAudience: vi.fn()
};

vi.mock('../../src/services/FeatureFlagService.js', () => ({
  __esModule: true,
  featureFlagService: featureFlagServiceStub,
  runtimeConfigService: runtimeConfigServiceStub
}));

const modulePromise = import('../../scripts/runtime-config.js');

let executeRuntimeConfig;
let parseRuntimeConfigArgs;

beforeAll(async () => {
  ({ executeRuntimeConfig, parseRuntimeConfigArgs } = await modulePromise);
});

const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

afterEach(() => {
  vi.clearAllMocks();
});

afterAll(() => {
  consoleLogSpy.mockRestore();
});

describe('parseRuntimeConfigArgs', () => {
  it('parses CLI arguments, merging environment defaults', () => {
    const args = [
      'node',
      'runtime-config.js',
      '--environment=staging',
      '--audience=internal',
      '--include-sensitive',
      '--format=json',
      '--output=out/snapshot.json',
      '--flag=alpha',
      '--config=beta',
      '--strict'
    ];

    const config = parseRuntimeConfigArgs(args, {
      RUNTIME_AUDIENCE: 'ops',
      RUNTIME_OUTPUT_FORMAT: 'log'
    });

    expect(config.environment).toBe('staging');
    expect(config.audience).toBe('internal');
    expect(config.includeSensitive).toBe(true);
    expect(config.format).toBe('json');
    expect(config.outputFile).toBe('out/snapshot.json');
    expect(config.flags).toEqual(['alpha']);
    expect(config.configs).toEqual(['beta']);
    expect(config.strict).toBe(true);
  });
});

describe('executeRuntimeConfig', () => {
  afterEach(() => {
    consoleLogSpy.mockClear();
  });

  it('evaluates requested keys, masks sensitive values, and writes the snapshot file', async () => {
    const loggerStub = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const dbStub = { migrate: { latest: vi.fn().mockResolvedValue() } };
    const featureFlagsStub = {
      start: vi.fn().mockResolvedValue(),
      stop: vi.fn(),
      evaluateAll: vi.fn().mockReturnValue({
        alpha: { enabled: true, evaluatedAt: 'now' },
        beta: { enabled: false }
      })
    };
    const runtimeConfigsStub = {
      start: vi.fn().mockResolvedValue(),
      stop: vi.fn(),
      listForAudience: vi.fn().mockReturnValue({
        beta: { value: 'super-secret', sensitive: true },
        gamma: { value: 42, sensitive: false }
      })
    };
    const mkdirMock = vi.fn().mockResolvedValue();
    const writeFileMock = vi.fn().mockResolvedValue();

    const { outputPayload, stats } = await executeRuntimeConfig(
      {
        environment: 'production',
        audience: 'internal',
        includeSensitive: true,
        includeFlags: true,
        includeConfigs: true,
        format: 'json',
        outputFile: 'out/runtime.json',
        flags: ['alpha'],
        configs: ['beta'],
        strict: false,
        maskSensitive: true
      },
      {
        dbClient: dbStub,
        featureFlags: featureFlagsStub,
        runtimeConfigs: runtimeConfigsStub,
        loggerInstance: loggerStub,
        fileSystem: { mkdir: mkdirMock, writeFile: writeFileMock }
      }
    );

    expect(featureFlagsStub.evaluateAll).toHaveBeenCalledWith(
      { environment: 'production' },
      { includeDefinition: true }
    );
    expect(runtimeConfigsStub.listForAudience).toHaveBeenCalledWith('production', {
      audience: 'internal',
      includeSensitive: true
    });
    expect(outputPayload.runtimeConfig.beta.value).toBe('***');
    expect(stats).toEqual({ featureFlagCount: 1, runtimeConfigCount: 1 });
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('"stats"'));
    expect(mkdirMock).toHaveBeenCalled();
    expect(writeFileMock).toHaveBeenCalledWith(
      expect.stringContaining('out/runtime.json'),
      expect.stringContaining('"featureFlagCount"'),
      'utf8'
    );
  });

  it('throws when sensitive data is requested for a non-internal audience', async () => {
    await expect(
      executeRuntimeConfig({
        environment: 'production',
        audience: 'public',
        includeSensitive: true,
        includeFlags: false,
        includeConfigs: true,
        format: 'log',
        outputFile: null,
        flags: [],
        configs: [],
        strict: false,
        maskSensitive: true
      })
    ).rejects.toThrow('Sensitive values can only be included for the internal audience.');
  });
});
