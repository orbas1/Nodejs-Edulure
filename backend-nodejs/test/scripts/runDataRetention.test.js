import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('dotenv', () => ({
  __esModule: true,
  default: { config: vi.fn() }
}));

const destroyMock = vi.fn().mockResolvedValue();

vi.mock('../../src/config/database.js', () => ({
  __esModule: true,
  default: { destroy: destroyMock }
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
    isDevelopment: false
  }
}));

const modulePromise = import('../../scripts/run-data-retention.js');

let executeRunDataRetention;
let parseRunDataRetentionArgs;

beforeAll(async () => {
  ({ executeRunDataRetention, parseRunDataRetentionArgs } = await modulePromise);
});

const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

afterEach(() => {
  vi.clearAllMocks();
});

afterAll(() => {
  consoleLogSpy.mockRestore();
});

describe('parseRunDataRetentionArgs', () => {
  it('parses CLI arguments and merges defaults', () => {
    const args = [
      'node',
      'run-data-retention.js',
      '--dry-run',
      '--alert-threshold=25',
      '--policy=communities',
      '--policy=3',
      '--format=json',
      '--output=out/report.json',
      '--exit-on-noop'
    ];

    const config = parseRunDataRetentionArgs(args, {
      DATA_RETENTION_MODE: 'commit',
      DATA_RETENTION_OUTPUT_FORMAT: 'text'
    });

    expect(config.mode).toBe('simulate');
    expect(config.alertThreshold).toBe(25);
    expect(config.policySelections).toEqual(['communities', '3']);
    expect(config.format).toBe('json');
    expect(config.outputFile).toBe('out/report.json');
    expect(config.exitOnNoop).toBe(true);
  });
});

describe('executeRunDataRetention', () => {
  afterEach(() => {
    consoleLogSpy.mockClear();
  });

  it('filters requested policies, emits JSON, and writes the summary file', async () => {
    const enforceMock = vi.fn().mockResolvedValue({
      dryRun: false,
      mode: 'commit',
      runId: 'run-123',
      results: [
        { status: 'executed', affectedRows: 7 },
        { status: 'failed' },
        { status: 'skipped-inactive' }
      ]
    });
    const fetchPoliciesMock = vi.fn().mockResolvedValue([
      { id: 1, entityName: 'user_sessions', active: true },
      { id: 2, entityName: 'communities', active: true }
    ]);
    const mkdirMock = vi.fn().mockResolvedValue();
    const writeFileMock = vi.fn().mockResolvedValue();
    const readFileMock = vi.fn().mockResolvedValue('communities\n');
    const loggerStub = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

    const result = await executeRunDataRetention(
      {
        mode: 'commit',
        verbose: false,
        alertThreshold: 100,
        format: 'json',
        policySelections: [],
        policyFile: 'policies.txt',
        outputFile: 'out/report.json',
        exitOnNoop: false
      },
      {
        enforce: enforceMock,
        fetchPolicies: fetchPoliciesMock,
        fileSystem: {
          readFile: readFileMock,
          mkdir: mkdirMock,
          writeFile: writeFileMock
        },
        loggerInstance: loggerStub
      }
    );

    expect(fetchPoliciesMock).toHaveBeenCalledTimes(1);
    expect(enforceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        policies: [expect.objectContaining({ entityName: 'communities' })],
        mode: 'commit'
      })
    );
    expect(result.stats).toMatchObject({ executed: 1, failed: 1, skipped: 1, affectedRows: 7 });
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('"stats"'));
    expect(mkdirMock).toHaveBeenCalled();
    expect(writeFileMock).toHaveBeenCalledWith(
      expect.stringContaining('out/report.json'),
      expect.stringContaining('"runId"'),
      'utf8'
    );
  });

  it('throws when referenced policies are missing', async () => {
    const fetchPoliciesMock = vi.fn().mockResolvedValue([
      { id: 10, entityName: 'user_sessions', active: true }
    ]);

    await expect(
      executeRunDataRetention(
        {
          mode: 'commit',
          verbose: false,
          alertThreshold: undefined,
          format: 'text',
          policySelections: ['unknown'],
          policyFile: null,
          outputFile: null,
          exitOnNoop: false
        },
        {
          fetchPolicies: fetchPoliciesMock,
          loggerInstance: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
        }
      )
    ).rejects.toThrow('Unknown retention policies: unknown');
  });
});
