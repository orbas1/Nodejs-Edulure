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
    isDevelopment: false,
    dataGovernance: { schemaGuard: { baselinePath: '/tmp/default-schema.json', monitoredTables: ['users'], includeIndexes: true } },
    database: { name: 'test' }
  }
}));

const modulePromise = import('../../scripts/verify-schema-drift.js');

let executeVerifySchema;
let parseVerifySchemaArgs;

beforeAll(async () => {
  ({ executeVerifySchema, parseVerifySchemaArgs } = await modulePromise);
});

const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

afterEach(() => {
  vi.clearAllMocks();
});

afterAll(() => {
  consoleLogSpy.mockRestore();
});

describe('parseVerifySchemaArgs', () => {
  it('parses CLI arguments and supports JSON output', () => {
    const args = [
      'node',
      'verify-schema-drift.js',
      '--baseline=./baselines/schema.json',
      '--tables=users,communities',
      '--no-indexes',
      '--format=json',
      '--output=reports/drift.json',
      '--schema=analytics'
    ];

    const config = parseVerifySchemaArgs(args);

    expect(config.baselinePath).toContain('baselines/schema.json');
    expect(config.tables).toEqual(['users', 'communities']);
    expect(config.includeIndexes).toBe(false);
    expect(config.format).toBe('json');
    expect(config.outputFile).toBe('reports/drift.json');
    expect(config.schema).toBe('analytics');
  });
});

describe('executeVerifySchema', () => {
  afterEach(() => {
    consoleLogSpy.mockClear();
  });

  it('writes a new baseline snapshot when run in write mode', async () => {
    const collectMock = vi.fn().mockResolvedValue({ snapshot: true });
    const writeMock = vi.fn().mockResolvedValue();
    const mkdirMock = vi.fn().mockResolvedValue();
    const writeFileMock = vi.fn().mockResolvedValue();
    const loggerStub = { info: vi.fn(), error: vi.fn(), warn: vi.fn() };

    const payload = await executeVerifySchema(
      {
        write: true,
        tables: null,
        baselinePath: null,
        includeIndexes: true,
        allowDrift: false,
        help: false,
        format: 'text',
        outputFile: 'reports/baseline.json',
        schema: null
      },
      {
        collect: collectMock,
        write: writeMock,
        fileSystem: { mkdir: mkdirMock, writeFile: writeFileMock },
        loggerInstance: loggerStub,
        schemaEnv: {
          database: { name: 'platform' },
          dataGovernance: {
            schemaGuard: {
              baselinePath: '/tmp/schema-baseline.json',
              monitoredTables: ['users'],
              includeIndexes: true
            }
          }
        }
      }
    );

    expect(writeMock).toHaveBeenCalledWith('/tmp/schema-baseline.json', { snapshot: true });
    expect(mkdirMock).toHaveBeenCalled();
    expect(writeFileMock).toHaveBeenCalledWith(
      expect.stringContaining('reports/baseline.json'),
      expect.stringContaining('"writtenAt"'),
      'utf8'
    );
    expect(payload).toMatchObject({ differences: [] });
  });

  it('returns drift details as JSON when differences are detected', async () => {
    const collectMock = vi.fn().mockResolvedValue({ snapshot: true });
    const loadMock = vi.fn().mockResolvedValue({ baseline: true });
    const diffMock = vi.fn().mockReturnValue([{ table: 'users', change: 'missing_column' }]);
    const summariseMock = vi.fn().mockReturnValue('users missing column');
    const mkdirMock = vi.fn().mockResolvedValue();
    const writeFileMock = vi.fn().mockResolvedValue();

    const result = await executeVerifySchema(
      {
        write: false,
        tables: null,
        baselinePath: null,
        includeIndexes: true,
        allowDrift: true,
        help: false,
        format: 'json',
        outputFile: 'reports/drift.json',
        schema: 'analytics'
      },
      {
        collect: collectMock,
        load: loadMock,
        diff: diffMock,
        summarise: summariseMock,
        fileSystem: { mkdir: mkdirMock, writeFile: writeFileMock },
        schemaEnv: {
          database: { name: 'platform' },
          dataGovernance: {
            schemaGuard: {
              baselinePath: '/tmp/schema-baseline.json',
              monitoredTables: ['users'],
              includeIndexes: true,
              failOnDrift: true
            }
          }
        }
      }
    );

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('"differences"'));
    expect(writeFileMock).toHaveBeenCalledWith(
      expect.stringContaining('reports/drift.json'),
      expect.stringContaining('"summary"'),
      'utf8'
    );
    expect(result.differences).toHaveLength(1);
  });
});
