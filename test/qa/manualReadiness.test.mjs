import { describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';

import { coveragePolicies, coverageTargets, manualQaPolicies } from '../../qa/policies/testing.js';
import { collectCoverageMatrix } from '../../scripts/qa/lib/coverage.js';
import { buildManualReadinessJson, buildManualReadinessMarkdown } from '../../scripts/qa/lib/manualReadiness.js';

async function withTempDir(callback) {
  const directory = await mkdtemp(path.join(tmpdir(), 'manual-readiness-'));
  try {
    return await callback(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

describe('manual readiness report', () => {
  it('summarises checklist and coverage data', async () => {
    await withTempDir(async (directory) => {
      for (const target of coverageTargets) {
        const targetPath = path.join(directory, target.relativePath);
        await mkdir(path.dirname(targetPath), { recursive: true });
        if (target.format === 'vitest-summary') {
          const fixture = target.id === 'backend'
            ? 'qa/fixtures/backend-coverage-summary.json'
            : 'qa/fixtures/frontend-coverage-summary.json';
          await writeFile(targetPath, await readFile(fixture));
        } else {
          await writeFile(targetPath, await readFile('qa/fixtures/flutter-lcov.info'));
        }
      }

      const checklistPath = path.join(directory, 'qa/release/core_release_checklist.json');
      await mkdir(path.dirname(checklistPath), { recursive: true });
      await writeFile(checklistPath, await readFile('qa/fixtures/sample-checklist.json'));

      const matrix = await collectCoverageMatrix({
        repoRoot: directory,
        targets: coverageTargets,
        policies: coveragePolicies
      });

      expect(matrix.surfaces).toHaveLength(3);
      expect(matrix.surfaces.every((surface) => surface.status === 'pass')).toBe(true);

      const checklist = JSON.parse(await readFile(checklistPath, 'utf8'));
      const markdown = buildManualReadinessMarkdown({ matrix, checklist, policies: manualQaPolicies });
      const json = buildManualReadinessJson({ matrix, checklist });

      expect(markdown).toContain('Manual QA Readiness');
      expect(markdown).toContain('Outstanding items: 1');
      expect(json.outstanding).toEqual(['qa-screenshots']);
    });
  });
});
