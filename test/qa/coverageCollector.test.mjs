import { describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { collectCoverageMatrix, parseLcovReport, parseVitestSummary } from '../../scripts/qa/lib/coverage.js';
import { coveragePolicies, coverageTargets } from '../../qa/policies/testing.js';

async function withTempDir(callback) {
  const directory = await mkdtemp(path.join(tmpdir(), 'coverage-matrix-'));
  try {
    return await callback(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

describe('coverage utilities', () => {
  it('parses vitest coverage summaries', () => {
    const summary = parseVitestSummary(
      JSON.stringify({
        total: {
          statements: { total: 10, covered: 9 },
          branches: { total: 8, covered: 6 },
          functions: { total: 5, covered: 4 },
          lines: { total: 10, covered: 9 }
        }
      })
    );

    expect(summary).toEqual({ statements: 0.9, branches: 0.75, functions: 0.8, lines: 0.9 });
  });

  it('parses lcov reports', () => {
    const report = parseLcovReport(`TN:\nSF:file.dart\nDA:1,1\nDA:2,0\nLF:2\nLH:1\nFNF:1\nFNH:1\nBRF:2\nBRH:1\nend_of_record`);
    expect(report).toEqual({ statements: 0.5, branches: 0.5, functions: 1, lines: 0.5 });
  });

  it('collects matrix across surfaces', async () => {
    await withTempDir(async (directory) => {
      const backendPath = path.join(directory, 'backend-nodejs/coverage');
      const frontendPath = path.join(directory, 'frontend-reactjs/coverage');
      const flutterPath = path.join(directory, 'Edulure-Flutter/coverage');

      await mkdir(backendPath, { recursive: true });
      await mkdir(frontendPath, { recursive: true });
      await mkdir(flutterPath, { recursive: true });

      await writeFile(path.join(backendPath, 'coverage-summary.json'), await readFile('qa/fixtures/backend-coverage-summary.json'));
      await writeFile(
        path.join(frontendPath, 'coverage-summary.json'),
        await readFile('qa/fixtures/frontend-coverage-summary.json')
      );
      await writeFile(path.join(flutterPath, 'lcov.info'), await readFile('qa/fixtures/flutter-lcov.info'));

      const matrix = await collectCoverageMatrix({
        repoRoot: directory,
        targets: coverageTargets,
        policies: coveragePolicies
      });

      const backend = matrix.surfaces.find((surface) => surface.id === 'backend');
      const flutter = matrix.surfaces.find((surface) => surface.id === 'flutter');

      expect(backend.status).toBe('pass');
      expect(flutter.metrics.lines).toBeGreaterThanOrEqual(70);
      expect(matrix.aggregate.average.statements).toBeGreaterThan(70);
    });
  });
});
