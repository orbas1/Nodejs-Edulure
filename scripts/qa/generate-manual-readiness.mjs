#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { collectCoverageMatrix } from './lib/coverage.js';
import { buildManualReadinessJson, buildManualReadinessMarkdown } from './lib/manualReadiness.js';
import { coveragePolicies, coverageTargets, manualQaPolicies } from '../../qa/policies/testing.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

function parseArgs(argv) {
  const options = {
    checklistPath: manualQaPolicies.checklist.defaultPath,
    outputMarkdown: 'qa/reports/manual-qa-readiness.md',
    outputJson: 'qa/reports/manual-qa-readiness.json'
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    switch (token) {
      case '--checklist':
      case '-c': {
        const value = argv[index + 1];
        if (!value) {
          throw new Error('Missing value for --checklist option');
        }
        options.checklistPath = value;
        index += 1;
        break;
      }
      case '--output-markdown': {
        const value = argv[index + 1];
        if (!value) {
          throw new Error('Missing value for --output-markdown option');
        }
        options.outputMarkdown = value;
        index += 1;
        break;
      }
      case '--output-json': {
        const value = argv[index + 1];
        if (!value) {
          throw new Error('Missing value for --output-json option');
        }
        options.outputJson = value;
        index += 1;
        break;
      }
      case '--help':
      case '-h':
        options.help = true;
        break;
      default:
        throw new Error(`Unknown argument '${token}'. Use --help for usage.`);
    }
  }

  return options;
}

function printHelp() {
  console.log(`Usage: node scripts/qa/generate-manual-readiness.mjs [options]\n\n` +
    `Options:\n` +
    `  -c, --checklist <path>       Path to the manual QA checklist JSON.\n` +
    `      --output-markdown <path> Markdown output path (default qa/reports/manual-qa-readiness.md).\n` +
    `      --output-json <path>     JSON output path (default qa/reports/manual-qa-readiness.json).\n` +
    `  -h, --help                   Display this help message.`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const checklistPath = path.resolve(repoRoot, options.checklistPath);
  let checklist;
  try {
    const rawChecklist = await readFile(checklistPath, 'utf8');
    checklist = JSON.parse(rawChecklist);
  } catch (error) {
    if (error.code !== 'ENOENT' || !manualQaPolicies.checklist?.slug) {
      throw error;
    }

    const { default: QaReadinessService } = await import('../../backend-nodejs/src/services/QaReadinessService.js');
    try {
      const dbChecklist = await QaReadinessService.getManualChecklist(manualQaPolicies.checklist.slug);
      checklist = {
        title: dbChecklist.title,
        version: dbChecklist.version,
        updatedAt: dbChecklist.updatedAt,
        items: (dbChecklist.items ?? []).map((item) => ({
          id: item.itemKey,
          description: item.label,
          owner: item.ownerTeam,
          status: item.defaultStatus,
          evidence: item.evidenceExamples ?? [],
          lastVerifiedAt: item.metadata?.lastVerifiedAt ?? null
        }))
      };
    } finally {
      if (typeof QaReadinessService.closeConnections === 'function') {
        await QaReadinessService.closeConnections();
      }
    }
  }

  const matrix = await collectCoverageMatrix({
    repoRoot,
    targets: coverageTargets,
    policies: coveragePolicies
  });

  const markdown = buildManualReadinessMarkdown({ matrix, checklist, policies: manualQaPolicies });
  const jsonReport = buildManualReadinessJson({ matrix, checklist });

  const markdownPath = path.resolve(repoRoot, options.outputMarkdown);
  await mkdir(path.dirname(markdownPath), { recursive: true });
  await writeFile(markdownPath, markdown, 'utf8');

  const jsonPath = path.resolve(repoRoot, options.outputJson);
  await mkdir(path.dirname(jsonPath), { recursive: true });
  await writeFile(jsonPath, JSON.stringify(jsonReport, null, 2), 'utf8');

  console.log(`Manual QA readiness written to ${path.relative(repoRoot, markdownPath)} and ${path.relative(repoRoot, jsonPath)}`);
}

main().catch((error) => {
  console.error(`Failed to generate manual QA readiness: ${error.message}`);
  process.exit(1);
});
