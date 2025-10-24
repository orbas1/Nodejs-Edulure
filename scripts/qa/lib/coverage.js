import { readFile } from 'node:fs/promises';
import path from 'node:path';

function round(value) {
  return Math.round(value * 10) / 10;
}

function computePercent(numerator, denominator) {
  if (denominator === 0) {
    return 1;
  }
  return numerator / denominator;
}

export function parseVitestSummary(jsonBuffer) {
  const data = typeof jsonBuffer === 'string' ? JSON.parse(jsonBuffer) : JSON.parse(jsonBuffer.toString());
  if (!data.total) {
    throw new Error('Vitest coverage summary is missing the "total" section.');
  }

  const total = data.total;
  return {
    statements: computePercent(total.statements?.covered ?? 0, total.statements?.total ?? 0),
    branches: computePercent(total.branches?.covered ?? 0, total.branches?.total ?? 0),
    functions: computePercent(total.functions?.covered ?? 0, total.functions?.total ?? 0),
    lines: computePercent(total.lines?.covered ?? 0, total.lines?.total ?? 0)
  };
}

export function parseLcovReport(textBuffer) {
  const text = typeof textBuffer === 'string' ? textBuffer : textBuffer.toString();
  const sections = text.split('end_of_record');
  let found = false;
  let statementsCovered = 0;
  let statementsTotal = 0;
  let functionsCovered = 0;
  let functionsTotal = 0;
  let branchesCovered = 0;
  let branchesTotal = 0;

  for (const section of sections) {
    if (!section.trim()) {
      continue;
    }
    found = true;
    const lines = section.split('\n');
    for (const line of lines) {
      if (line.startsWith('LF:')) {
        statementsTotal += Number.parseInt(line.slice(3), 10) || 0;
      } else if (line.startsWith('LH:')) {
        statementsCovered += Number.parseInt(line.slice(3), 10) || 0;
      } else if (line.startsWith('FNF:')) {
        functionsTotal += Number.parseInt(line.slice(4), 10) || 0;
      } else if (line.startsWith('FNH:')) {
        functionsCovered += Number.parseInt(line.slice(4), 10) || 0;
      } else if (line.startsWith('BRF:')) {
        branchesTotal += Number.parseInt(line.slice(4), 10) || 0;
      } else if (line.startsWith('BRH:')) {
        branchesCovered += Number.parseInt(line.slice(4), 10) || 0;
      }
    }
  }

  if (!found) {
    throw new Error('LCOV report is empty or malformed.');
  }

  return {
    statements: computePercent(statementsCovered, statementsTotal),
    branches: computePercent(branchesCovered, branchesTotal),
    functions: computePercent(functionsCovered, functionsTotal),
    lines: computePercent(statementsCovered, statementsTotal)
  };
}

function toStatus(value, thresholds) {
  if (!thresholds) {
    return 'unknown';
  }
  const fails = Object.entries(thresholds).filter(([metric, threshold]) => {
    const coverageValue = value[metric];
    return typeof coverageValue !== 'number' || coverageValue < threshold;
  });

  return fails.length === 0 ? 'pass' : 'fail';
}

export function formatCoverageResult({ id, label, coverage, thresholds, source }) {
  const metrics = {
    statements: round((coverage?.statements ?? 0) * 100),
    branches: round((coverage?.branches ?? 0) * 100),
    functions: round((coverage?.functions ?? 0) * 100),
    lines: round((coverage?.lines ?? 0) * 100)
  };

  return {
    id,
    label,
    source,
    status: toStatus(coverage, thresholds),
    metrics,
    thresholds: thresholds
      ? Object.fromEntries(Object.entries(thresholds).map(([metric, value]) => [metric, Math.round(value * 100)]))
      : undefined
  };
}

export async function loadCoverageFromTarget({ repoRoot, target }) {
  const absolutePath = path.resolve(repoRoot, target.relativePath);
  try {
    const buffer = await readFile(absolutePath);
    if (target.format === 'vitest-summary') {
      return parseVitestSummary(buffer);
    }
    if (target.format === 'lcov') {
      return parseLcovReport(buffer);
    }
    throw new Error(`Unsupported coverage format '${target.format}' for target ${target.id}`);
  } catch (error) {
    return {
      error: error.code === 'ENOENT' ? 'missing' : error.message ?? 'unknown',
      coverage: undefined,
      source: absolutePath
    };
  }
}

export async function collectCoverageMatrix({
  repoRoot,
  targets,
  policies,
  now = new Date()
}) {
  const surfaces = [];
  for (const target of targets) {
    const policy = policies[target.id];
    const result = await loadCoverageFromTarget({ repoRoot, target });
    if (result?.error) {
      surfaces.push({
        id: target.id,
        label: target.label,
        source: result.source,
        status: 'missing',
        error: result.error
      });
      continue;
    }

    const formatted = formatCoverageResult({
      id: target.id,
      label: target.label,
      coverage: result,
      thresholds: policy?.thresholds,
      source: path.resolve(repoRoot, target.relativePath)
    });
    surfaces.push(formatted);
  }

  const aggregate = (() => {
    const numericSurfaces = surfaces.filter((surface) => surface.status !== 'missing');
    if (numericSurfaces.length === 0) {
      return undefined;
    }

    const sums = { statements: 0, branches: 0, functions: 0, lines: 0 };
    for (const surface of numericSurfaces) {
      sums.statements += surface.metrics.statements;
      sums.branches += surface.metrics.branches;
      sums.functions += surface.metrics.functions;
      sums.lines += surface.metrics.lines;
    }
    return {
      average: {
        statements: round(sums.statements / numericSurfaces.length),
        branches: round(sums.branches / numericSurfaces.length),
        functions: round(sums.functions / numericSurfaces.length),
        lines: round(sums.lines / numericSurfaces.length)
      }
    };
  })();

  return {
    generatedAt: new Date(now).toISOString(),
    surfaces,
    aggregate
  };
}
