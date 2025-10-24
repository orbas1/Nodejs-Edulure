export function formatChecklistItem(item, evidenceField) {
  const status = item.status === 'complete' ? '✅' : item.status === 'blocked' ? '⛔️' : '⬜️';
  const evidence = item[evidenceField] ?? [];
  const evidenceNote = evidence.length ? ` (evidence: ${evidence.join(', ')})` : '';
  return `${status} ${item.description}${evidenceNote}`;
}

export function buildManualReadinessMarkdown({ matrix, checklist, policies }) {
  const lines = [];
  lines.push('# Manual QA Readiness');
  lines.push('');
  lines.push(`Generated: ${matrix.generatedAt}`);
  lines.push('');
  lines.push('## Automated Coverage Summary');
  lines.push('');
  if (!matrix.surfaces.length) {
    lines.push('No coverage data was discovered.');
  } else {
    lines.push('| Surface | Statements | Branches | Functions | Lines | Threshold | Status |');
    lines.push('| --- | --- | --- | --- | --- | --- | --- |');
    for (const surface of matrix.surfaces) {
      if (surface.status === 'missing') {
        lines.push(`| ${surface.label} | — | — | — | — | ${(policies[surface.id]?.thresholds && 'policy') || 'n/a'} | Missing (${surface.error}) |`);
        continue;
      }
      const thresholds = surface.thresholds
        ? `${surface.thresholds.statements}% / ${surface.thresholds.branches}% / ${surface.thresholds.functions}% / ${surface.thresholds.lines}%`
        : 'n/a';
      lines.push(
        `| ${surface.label} | ${surface.metrics.statements}% | ${surface.metrics.branches}% | ${surface.metrics.functions}% | ${surface.metrics.lines}% | ${thresholds} | ${surface.status} |`
      );
    }
  }
  lines.push('');
  if (matrix.aggregate) {
    lines.push(
      `Average coverage: statements ${matrix.aggregate.average.statements}%, branches ${matrix.aggregate.average.branches}%, functions ${matrix.aggregate.average.functions}%, lines ${matrix.aggregate.average.lines}%`
    );
    lines.push('');
  }

  lines.push('## Manual Checklist Snapshot');
  lines.push('');
  const evidenceField = policies.checklist.evidenceField;
  for (const item of checklist.items ?? []) {
    lines.push(`- ${formatChecklistItem(item, evidenceField)}`);
  }

  const outstanding = (checklist.items ?? []).filter((item) => item.status !== 'complete');
  lines.push('');
  lines.push(`Outstanding items: ${outstanding.length}`);
  return lines.join('\n');
}

export function buildManualReadinessJson({ matrix, checklist }) {
  return {
    generatedAt: matrix.generatedAt,
    outstanding: (checklist.items ?? []).filter((item) => item.status !== 'complete').map((item) => item.id),
    checklist: checklist.items ?? [],
    coverage: matrix
  };
}
